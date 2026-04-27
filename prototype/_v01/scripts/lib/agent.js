const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { fileExists, readText, resolveWorkspacePath } = require('./common');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

const runningChildren = new Set();

function killAllChildren() {
  for (const child of runningChildren) {
    try {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    } catch (_) {}
  }
  runningChildren.clear();
}

process.on('SIGINT', () => {
  console.log('\n[Agent] SIGINT received. Killing all running agents...');
  killAllChildren();
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n[Agent] SIGTERM received. Killing all running agents...');
  killAllChildren();
  process.exit(143);
});

process.on('exit', () => {
  killAllChildren();
});

async function executeAgentStep({ stepId, prompt, tools, outputSchema, maxTokens, agentRole, codebasePath }) {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    let currentChild = null;

    function attemptExecution() {
      attempt++;
      console.log(`[Agent] Spawning ${agentRole || 'agent'} for step: ${stepId} (attempt ${attempt}/${MAX_RETRIES})`);

      const outputFile = path.join(resolveWorkspacePath(''), '.tmp', `agent-output-${stepId}-${Date.now()}.yaml`);
      const agentPrompt = buildAgentPrompt({ stepId, prompt, tools, outputSchema, maxTokens, outputFile, codebasePath });

      fs.mkdirSync(path.dirname(outputFile), { recursive: true });

      const child = spawn('opencode', ['run', '--dir', process.cwd()], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: { ...process.env },
      });

      currentChild = child;
      runningChildren.add(child);

      child.on('exit', () => {
        runningChildren.delete(child);
        currentChild = null;
      });

      if (child.stdin) {
        child.stdin.write(agentPrompt);
        child.stdin.end();
      }

      child.on('exit', (code) => {
        if (code === 0) {
          try {
            if (!fileExists(outputFile)) {
              throw new Error(`Agent did not write output file: ${outputFile}`);
            }

            const outputContent = readText(outputFile);
            const result = parseAgentOutput(outputContent);

            fs.unlinkSync(outputFile);

            console.log(`[Agent] Step ${stepId} completed`);
            resolve(result);
          } catch (parseErr) {
            handleError(parseErr.message);
          }
        } else {
          handleError(`Agent exited with code ${code}`);
        }
      });

      child.on('error', (err) => {
        runningChildren.delete(child);
        currentChild = null;
        handleError(`Spawn error: ${err.message}`);
      });
    }

    function handleError(message) {
      console.error(`[Agent] Step ${stepId} failed: ${message}`);

      if (attempt < MAX_RETRIES) {
        console.log(`[Agent] Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        setTimeout(attemptExecution, RETRY_DELAY_MS);
      } else {
        reject(new Error(`Step ${stepId} failed after ${MAX_RETRIES} attempts: ${message}`));
      }
    }

    attemptExecution();
  });
}

function buildAgentPrompt({ stepId, prompt, tools, outputSchema, maxTokens, outputFile, codebasePath }) {
  const toolsList = (tools || []).join(', ');

  let codebaseSection = '';
  if (codebasePath) {
    codebaseSection = `
## CRITICAL: Codebase Location
The codebase is at: ${codebasePath}

When reading source files, ALWAYS use the full path:
  ${codebasePath}/src/features/auth/api/auth-service.js  ← CORRECT

NEVER read files relative to the prototype workspace:
  src/features/auth/api/auth-service.js  ← WRONG (resolves to prototype workspace)
`;
  }

  let schemaDescription = '';
  if (outputSchema) {
    schemaDescription = `
## Output Schema
You must produce output that conforms to this JSON schema:
${JSON.stringify(outputSchema, null, 2)}

Format your response as YAML.`;
  }

  return `You are executing a single step in a spec generation pipeline.

## Step: ${stepId}
${codebaseSection}
## Instructions
${prompt}

## Available Tools
You may use these tools: ${toolsList || 'none'}
${schemaDescription}

## Output Destination
Write your final output as YAML to this exact file:
${outputFile}

## Rules
- Execute ONLY this step. Do not proceed to other steps.
- Use tools to explore the codebase as needed.
- Write your final structured output to the file specified above.
- Do NOT write comments in YAML output (no # lines). Pure YAML only.
- Be concise but thorough.
- If you cannot complete the step, set status: "failed" and explain in failure_reason.
`;
}

function parseAgentOutput(content) {
  const YAML = require('yaml');
  return YAML.parse(content);
}

module.exports = {
  executeAgentStep,
};
