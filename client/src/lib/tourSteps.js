export function getAuditSteps(hasLogs) {
  const steps = [
    {
      target: '[data-tour="audit-heading"]',
      title: 'Audit logs',
      content: 'An immutable record of every security-relevant action in this team logins, secret changes, invites, sharing, and more.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="audit-search"]',
      title: 'Search the log',
      content: 'Search by actor email, action name, or resource ID to narrow things down fast.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="audit-filter"]',
      title: 'Filter by category',
      content: 'Narrow to just secrets, sharing, invites, auth, or 2FA events.',
      placement: 'bottom',
    },
  ];

  if (hasLogs) {
    steps.push({
      target: '[data-tour="audit-results"]',
      title: 'Reading an entry',
      content: 'Each row shows who did it (Actor), what happened (Action), and what it touched (Resource) plus when and from which IP.',
      placement: 'top',
    });
  }

  return steps;
}

export function getCompareSteps() {
  return [
    {
      target: '[data-tour="cmp-heading"]',
      title: 'Compare environments',
      content: 'See exactly what differs between any two environments in this project before you promote changes.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="cmp-source"]',
      title: 'Source environment',
      content: "The environment you're comparing from usually the one with your latest changes, like Development.",
      placement: 'bottom',
    },
    {
      target: '[data-tour="cmp-target"]',
      title: 'Target environment',
      content: "The environment you're comparing against usually where you want to promote changes to, like Production.",
      placement: 'bottom',
    },
    {
      target: '[data-tour="cmp-tags"]',
      title: 'Reading the tags',
      content: 'Same means both environments match. Missing means a key exists in one but not the other. Different value/protection flags a mismatch worth reviewing.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="cmp-rows"]',
      title: 'Pick what to sync',
      content: "Check the variables you want copied from source to target anything already identical can't be selected.",
      placement: 'top',
    },
    {
      target: '[data-tour="cmp-sync"]',
      title: 'Sync to target',
      content: "Copies your selected variables into the target environment, overwriting any existing values for those keys. You'll confirm before anything changes.",
      placement: 'left',
    },
  ];
}

export function getCompanySteps(setTab, isAdmin) {
  const steps = [
    {
      target: '[data-tour="team-heading"]',
      title: 'Your team workspace',
      content: 'Projects and teammates for this team live here. Open a project to manage its environments and variables.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="team-new-project"]',
      title: 'Create a project',
      content: 'Each project gets its own environments (dev, staging, production) and encrypted variables.',
      placement: 'left',
    },
  ];

  if (isAdmin) {
    steps.push({
      target: '[data-tour="team-invite-form"]',
      before: async () => {
        setTab('team');
        await new Promise((resolve) => setTimeout(resolve, 120));
      },
      title: 'Invite teammates',
      content: 'Invite by email and pick their role: Member can view and manage variables. Admin can additionally invite/remove people, rename or delete the team, and view audit logs.',
      placement: 'bottom',
    });
  }

  steps.push({
    target: '[data-tour="team-members"]',
    before: async () => {
      setTab('team');
      await new Promise((resolve) => setTimeout(resolve, 120));
    },
    title: 'Team members',
    content: "Everyone with access to this workspace, and the role they hold.",
    placement: 'top',
  });

  return steps;
}

export function getDashboardSteps(hasCompanies) {
  const steps = [
    {
      target: '[data-tour="dash-heading"]',
      title: 'Welcome to EnvGuard',
      content: 'This is your workspace hub every team you belong to lives here, each with its own projects and encrypted variables.',
      placement: 'bottom',
    },
  ];

  if (hasCompanies) {
    steps.push(
      {
        target: '[data-tour="dash-search"]',
        title: 'Find a team fast',
        content: "Once you're in a few teams, this narrows the list by name.",
        placement: 'bottom',
      },
      {
        target: '[data-tour="dash-team-card"]',
        title: 'Open a team',
        content: "Click any card to see its projects. The badge shows whether you're an admin or a member there.",
        placement: 'bottom',
      }
    );
  }

steps.push({
    target: '[data-tour="dash-new-team"]',
    title: 'Start a new team',
    content: "Spin up a fresh workspace any time, you'll be its admin by default.",
    placement: 'left',
  });

  steps.push({
    target: '[data-tour="dash-cli"]',
    title: 'Prefer the terminal?',
    content: "The CLI lets you list, reveal, and sync variables without leaving VS Code, install it once and log in with this same account.",
    placement: 'bottom',
  });

  return steps;
}

export function getProjectSteps(hasVariables) {
  const steps = [
    {
      target: '[data-tour="proj-heading"]',
      title: 'Your project',
      content: 'Everything here environments, variables, and sharing is scoped to this one project.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="proj-environments"]',
      title: 'Switch environments',
      content: 'Dev, staging, production each keeps its own set of variables. Click a tile to switch, or add a new one.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="var-add"]',
      title: 'Add a variable',
      content: 'Store a key/value pair. Mark it "protected" to keep it masked until someone clicks reveal.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="var-import"]',
      title: 'Import from a .env file',
      content: 'Already have a .env locally? Upload it or paste it in. EnvGuard parses and encrypts every line.',
      placement: 'bottom',
    },
  ];

  if (hasVariables) {
    steps.push({
      target: '[data-tour="var-share"]',
      title: 'Share safely',
      content: 'Generate a one-time link for teammates instead of pasting secrets in Slack. It expires on its own.',
      placement: 'bottom',
    });
  }

  steps.push({
    target: '[data-tour="proj-compare-link"]',
    title: 'Compare environments',
    content: 'See exactly what differs between two environments, then copy variables across in one click.',
    placement: 'left',
  });

  return steps;
}