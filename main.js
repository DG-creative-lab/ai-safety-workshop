const revealTargets = document.querySelectorAll(".reveal-group");

revealTargets.forEach((element, index) => {
  element.style.transitionDelay = `${index * 90}ms`;
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

revealTargets.forEach((element) => observer.observe(element));

const workshopPolicy = {
  allowedCommands: ["pytest", "git status", "git diff", "ls", "cat", "sed", "rg", "grep"],
  blockedPatterns: [
    { pattern: /\brm\s+-rf\b/i, reason: "Recursive deletion is explicitly blocked." },
    { pattern: /\bmkfs\b/i, reason: "Formatting filesystems is blocked." },
    { pattern: /\bdd\b.*\bof=\/dev\//i, reason: "Raw disk writes are blocked." },
    { pattern: /\bgit\s+reset\s+--hard\b/i, reason: "Hard resets are destructive and blocked." },
    { pattern: /\bgit\s+push\s+--force\b/i, reason: "Force pushing shared history is blocked." },
    { pattern: /\b(cat|printenv|env)\b.*(\.env|token|secret|passwd)/i, reason: "Secret dumping is blocked." },
  ],
  blockedPaths: ["/etc", "/var", "/home", "~/", "/dev"],
  workspacePrefixes: ["./", "tests/", "src/", "docs/", "/workspace/project"],
  networkEnabled: false,
};

const commandInput = document.querySelector("#command-input");
const runCheckButton = document.querySelector("#run-check");
const verdictBadge = document.querySelector("#verdict-badge");
const verdictTitle = document.querySelector("#verdict-title");
const verdictCopy = document.querySelector("#verdict-copy");
const verdictChecks = document.querySelector("#verdict-checks");
const scenarioChips = document.querySelectorAll(".scenario-chip");

const renderChecks = (checks) => {
  verdictChecks.innerHTML = "";

  checks.forEach((check) => {
    const item = document.createElement("div");
    item.className = `check-item ${check.type}`;
    item.innerHTML = `
      <span>${check.label}</span>
      <div>
        <strong>${check.title}</strong>
        <div>${check.message}</div>
      </div>
    `;
    verdictChecks.appendChild(item);
  });
};

const setVerdict = ({ state, title, copy, checks }) => {
  verdictBadge.textContent = state;
  verdictBadge.className = "verdict";

  if (state === "Allowed") {
    verdictBadge.classList.add("verdict-allow");
  } else if (state === "Blocked") {
    verdictBadge.classList.add("verdict-block");
  } else {
    verdictBadge.classList.add("verdict-review");
  }

  verdictTitle.textContent = title;
  verdictCopy.textContent = copy;
  renderChecks(checks);
};

const evaluateCommand = (rawCommand) => {
  const command = rawCommand.trim();

  if (!command) {
    return {
      state: "Review",
      title: "No command supplied.",
      copy: "The shield cannot evaluate an empty request.",
      checks: [
        {
          type: "review",
          label: "Review",
          title: "Missing input",
          message: "Paste the exact shell command the agent wants to run.",
        },
      ],
    };
  }

  const checks = [];
  const normalized = command.replace(/\s+/g, " ").trim();
  const primaryCommand = normalized.split(" ")[0];

  checks.push({
    type: "allow",
    label: "Rule",
    title: "Command captured",
    message: `The shield inspects the proposed tool call before execution: ${normalized}`,
  });

  if (/[|;&$`()]/.test(command)) {
    checks.push({
      type: "block",
      label: "Block",
      title: "Chained shell control detected",
      message: "Pipes, subshells, and command chaining increase risk and are blocked in the workshop profile.",
    });

    return {
      state: "Blocked",
      title: "Command chaining is not allowed.",
      copy: "The portable shield rejects compound shell expressions because they hide intent and widen blast radius.",
      checks,
    };
  }

  const blockedPattern = workshopPolicy.blockedPatterns.find(({ pattern }) => pattern.test(normalized));

  if (blockedPattern) {
    checks.push({
      type: "block",
      label: "Block",
      title: "Matched blocked pattern",
      message: blockedPattern.reason,
    });

    return {
      state: "Blocked",
      title: "Policy blocked a known dangerous pattern.",
      copy: "This command would never reach the executor. The agent would receive a structured refusal instead.",
      checks,
    };
  }

  if (!workshopPolicy.networkEnabled && /\b(curl|wget|scp|nc)\b/i.test(normalized)) {
    checks.push({
      type: "block",
      label: "Block",
      title: "Outbound network disabled",
      message: "The workshop policy blocks external network access unless a domain is explicitly approved.",
    });

    return {
      state: "Blocked",
      title: "Network access is disabled in this shield profile.",
      copy: "No outbound calls means no quiet exfiltration and no surprise downloads from model output.",
      checks,
    };
  }

  const blockedPath = workshopPolicy.blockedPaths.find((path) => normalized.includes(path));

  if (blockedPath) {
    checks.push({
      type: "block",
      label: "Block",
      title: "Blocked path reference",
      message: `The command touches ${blockedPath}, which is outside the lab box.`,
    });

    return {
      state: "Blocked",
      title: "Command reaches outside the approved workspace.",
      copy: "The portable shield keeps the agent inside bounded project paths and away from host files.",
      checks,
    };
  }

  if (!workshopPolicy.allowedCommands.includes(normalized) && !workshopPolicy.allowedCommands.includes(primaryCommand)) {
    checks.push({
      type: "review",
      label: "Review",
      title: "Command not on allowlist",
      message: `${primaryCommand} is not in the current workshop allowlist.`,
    });

    return {
      state: "Review",
      title: "This command needs policy review first.",
      copy: "The shield does not auto-approve unknown tools. Add a rule, wrapper, or test before execution.",
      checks,
    };
  }

  const touchesWorkspacePath = workshopPolicy.workspacePrefixes.some((path) => normalized.includes(path));

  checks.push({
    type: "allow",
    label: "Allow",
    title: "Allowed command",
    message: `${primaryCommand} is part of the workshop allowlist.`,
  });

  checks.push({
    type: touchesWorkspacePath || primaryCommand === "git" || primaryCommand === "pytest" ? "allow" : "review",
    label: touchesWorkspacePath || primaryCommand === "git" || primaryCommand === "pytest" ? "Allow" : "Review",
    title: touchesWorkspacePath || primaryCommand === "git" || primaryCommand === "pytest" ? "Expected workspace scope" : "Scope inferred from command",
    message: touchesWorkspacePath || primaryCommand === "git" || primaryCommand === "pytest"
      ? "The command appears to stay within the workshop repo and safe tooling."
      : "The command is allowed, but path scope should still be checked by the executor.",
  });

  return {
    state: touchesWorkspacePath || primaryCommand === "git" || primaryCommand === "pytest" ? "Allowed" : "Review",
    title: touchesWorkspacePath || primaryCommand === "git" || primaryCommand === "pytest"
      ? "Command fits the current workshop policy."
      : "Command is allowed but should be executed with path guards.",
    copy: touchesWorkspacePath || primaryCommand === "git" || primaryCommand === "pytest"
      ? "This would pass to the sandbox executor with logs recorded for the harness loop."
      : "The shield would likely wrap this in a tighter executor before allowing it through.",
    checks,
  };
};

const runPolicyCheck = () => {
  setVerdict(evaluateCommand(commandInput.value));
};

runCheckButton.addEventListener("click", runPolicyCheck);

scenarioChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    commandInput.value = chip.dataset.command || "";
    runPolicyCheck();
  });
});

runPolicyCheck();
