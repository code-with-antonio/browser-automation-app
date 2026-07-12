# Billing — prompts

We've built the whole workflow builder. Now we put paid features behind a plan: the Agent node
— our most expensive one — becomes premium, and then, as a broader example, creating a workflow
at all requires the pro plan.

Short lesson — we don't teach the agent how billing works. The `clerk-billing` skill already
knows (org plans, entitlement checks, the pricing table, and Clerk's checkout). We lay the
foundation first, then each gate is a sentence.

---

## Prompt 1 — enable billing and create the plan

```
Using the clerk-billing skill, turn on Clerk billing for this app. It's
organization-based, so enable it for organizations and add a "pro" plan that orgs can
subscribe to.
```

_On a dev instance, Clerk provides a shared payment gateway, so you can test the whole checkout
without a Stripe account. If the Clerk CLI isn't linked to your app, do this in the
[Dashboard](https://dashboard.clerk.com/last-active?path=billing/settings) instead (Organization
Plans tab)._

---

## Prompt 2 — build the pricing page and pro-gate hook

```
Using the clerk-billing skill, build the pricing page: put it in the app's dashboard
route group so it sits inside the dashboard layout, show the org plans, and let them
subscribe and check out.

We're about to gate a few things behind pro, so also add a reusable hook in the
workflows feature's hooks folder that tells a component whether the active org is on
pro and can send someone to that pricing page to upgrade.
```

---

## Prompt 3 — gate the Agent node

```
The Agent node is our most expensive node, so make it premium. Only orgs on the pro
plan can add it to the canvas; every other node stays free, so anyone can still build
workflows.

In @features/workflows/components/right-sidebar.tsx, the toolbar lists every node you
can add. For a non-pro org, the Agent node shows as locked, and clicking it sends them
to upgrade instead of adding it. Use the pro-gate hook.
```

---

## Prompt 4 — gate workflow creation

```
Creating a workflow at all should require the pro plan too — the broad version of the
same gate.

Enforce it in @features/workflows/actions.ts (createWorkflowAction) so it can't be
bypassed, and on the "New workflow" button in
@features/workflows/components/workflow-nav.tsx, where a non-pro org gets nudged to
upgrade instead of creating. Reuse the pro-gate hook on the button.

Use the clerk-billing skill for the server-side plan check.
```

---

## Now play around

That's the whole gate. It's a reusable tool now — put anything behind pro the same way: a
different node, running a workflow, an export. One line of intent per gate.
