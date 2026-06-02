Q1. Which parts of the code were AI-assisted?
A: 100% of the code was AI generated.

Q2. What prompts or approaches were effective?
A: Mostly clear intent and simple prompts. For this task, the work was straightforward, so short prompts were enough most of the time. For brainstorming or research, I usually go longer. I also used the Superpowers plugin and sub-agents for online research.

My workflow: [AI-assisted workflow](https://docs.google.com/document/d/1O6yGXW-O0mVxbhdULJJx5zepSTUpckNUVcS-f1c8emA/edit?usp=sharing)

Q3. What did you have to correct or rework?
A:

- `tasks.md` originally had too many tasks for a small project, so I compressed it into fewer, bigger steps.
- `.gitignore` included some entries I did not need, so I instructed the agent to clean it up.
- `.wtcrc.json` had dummy Mongo credentials hardcoded, so I asked the agent to investigate it and fix the setup.
- `AGENTS.md` had some extra rules that were not needed for this task, so I removed them.
- `docs/local-development.md` felt unnecessary for a small project, so I instructed the agent to delete it and keep setup docs in the README.
- The bootstrap file had a Step 16 issue: Codex review should be a manual human prompt, not something the agent marks as automatically done, so I instructed the agent to refactor that wording.
