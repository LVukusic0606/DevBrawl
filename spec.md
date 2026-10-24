# DevBrawl — Product Concept and Feature Specification

## 0. Hackathon Context and Decisions

DevBrawl is our project for **Ri-Hack 4.0** (Rijeka, 23–25 October 2026).

The theme is **"Encouraging people to learn in the age of AI"**: build a solution that motivates people to actively learn and develop real understanding instead of only looking for ready-made answers. The jury evaluates creativity and innovation as well as technical complexity and polish.

DevBrawl answers this theme for software developers: AI can write code, but someone still has to understand how systems work in order to review, debug, and design them. DevBrawl makes building that understanding competitive and fun through game elements, interactive challenges, and progress tracking.

### Team

Three developers: two backend developers and one frontend developer.

### Technology stack

| Area | Choice |
|---|---|
| Backend | ASP.NET Core Web API (.NET 10) |
| Frontend | React + Vite + TypeScript (UI libraries and styling decided by the frontend developer) |
| Database | PostgreSQL 18 |
| Real-time | SignalR (for 1v1 duels) |
| Deployment | Public domain, if time allows; otherwise run locally for the demo |

### Scope decisions for the hackathon

| Topic | Decision |
|---|---|
| Accounts | Real registration and login. |
| Opponents | Real 1v1 duels between two logged-in players. No bot opponent. |
| Duel format | Exactly 5 rounds per duel, one of each challenge type (A–E). |
| Practice duels | Not implemented. Every duel is ranked. |
| Language | All UI and content in English. |
| Content | A small, hardcoded set of lessons, quizzes, and challenges, just enough to demonstrate every feature. |
| AI | Not part of the MVP. Stretch goal: AI-generated questions (see section 16). |

Values marked **(default)** in this document are decisions we made to unblock development. They can be changed, but change them deliberately and update this document.

---

## 1. What is DevBrawl?

DevBrawl is a competitive learning platform for software developers.

It combines two main experiences:

1. **Learn:** Users study short lessons that explain individual software engineering concepts and then test their understanding through solo quizzes.
2. **Brawl:** Users compete against other players in 1v1 duels that test their practical understanding of software engineering concepts through interactive challenges.

The platform focuses on understanding how software systems work rather than memorizing syntax or solving traditional algorithmic coding problems.

Topics include APIs, networking, databases, security, debugging, infrastructure, system design, and other practical software engineering concepts.

The core philosophy is:

**Learn a concept. Test your understanding. Prove your skills in the arena.**

The application should feel like a modern learning platform combined with a competitive gaming experience.

---

## 2. Main Application Structure

DevBrawl is organized around technical categories.

Initial categories:

- APIs & Networking
- Databases
- Security
- Debugging
- System Design
- Infrastructure

Each category has its own content, learning progression, and ELO rating.

For example, a user might have:

- APIs & Networking: 1350 ELO
- Databases: 1080 ELO
- Security: 1420 ELO
- Debugging: 1510 ELO
- System Design: 1190 ELO
- Infrastructure: 950 ELO

These ratings are independent of each other.

A user can be highly skilled at debugging but still be a beginner at infrastructure.

The platform must reflect this distinction throughout the application.

The main navigation should provide access to:

- Dashboard
- Learn
- Brawl
- Leaderboards
- Profile

The two most important sections are Learn and Brawl.

---

## 3. Accounts and Authentication

Users must register and log in to use DevBrawl.

### Registration

A user registers with:

- Nickname (unique, shown on leaderboards and to opponents)
- Email (unique)
- Password

Passwords must be stored hashed, never in plain text.

When a user registers, they receive a starting ELO rating in every category (see section 8) and start at level 1 with 0 XP.

### Login

- A user logs in with email and password.
- Authentication is token-based (default: JWT bearer tokens).
- All pages except the login and registration pages require a logged-in user.
- All API endpoints except registration, login, and health checks require authentication.
- The SignalR duel connection must also be authenticated, so the server always knows which user is sending each answer.

### Out of scope for the hackathon

Password reset, email verification, social login, and account deletion.

---

## 4. Feature One: Learn

### Purpose

The Learn section teaches users individual software engineering concepts through short, focused lessons.

Each lesson explains one specific concept, behavior, problem, or engineering principle.

Lessons should be concise and practical rather than long-form courses.

The objective is to help users understand concepts they can later encounter in Brawl challenges.

### Category structure

Each category contains multiple lessons organized into a logical learning path.

Example: APIs & Networking.

Possible lessons:

1. What is HTTP?
2. HTTP Methods: GET, POST, PUT, PATCH, and DELETE.
3. Understanding HTTP Status Codes.
4. HTTP Headers.
5. Authentication vs. Authorization.
6. REST API Fundamentals.
7. What Happens During an API Request?
8. Timeouts and Network Failures.
9. Rate Limiting.
10. Caching and HTTP Cache Headers.

Example: Databases.

Possible lessons:

1. Relational Databases.
2. Primary and Foreign Keys.
3. SQL Joins.
4. Database Indexes.
5. Transactions and ACID.
6. Database Normalization.
7. N+1 Query Problems.
8. Database Connection Pools.

These lists show the intended direction. For the hackathon, only a few lessons are written (see section 14).

The categories should be expandable so additional lessons can be added without redesigning the application.

### Lesson structure

Each lesson should focus on one concept and contain:

- **Title:** A clear name for the concept.
- **Introduction:** A brief explanation of what the concept is.
- **How it works:** An accessible explanation of the underlying mechanism.
- **Example:** A practical scenario, code snippet, request, response, diagram, or other relevant illustration.
- **Common mistakes:** Typical misunderstandings or implementation errors.
- **Key takeaway:** A concise summary of the most important idea.
- **Start Quiz:** An action that takes the user to the lesson's solo quiz.

For example, a lesson about HTTP 401 vs. 403 should explain the difference between authentication and authorization, illustrate both situations, and show the relevant HTTP responses.

Lessons should be short enough to complete in a few minutes.

The goal is understanding, not merely reading through large amounts of text.

### Lesson progression

Users should be able to browse lessons within a category and see which lessons they have completed.

The interface may show:

- Completed lessons.
- Lessons not yet completed.
- Quiz results.
- Overall category learning progress.

Lesson states:

- **Not started:** The user has never opened the lesson.
- **In progress (default):** The user has opened the lesson but has not completed its quiz.
- **Completed (default):** The user has finished the lesson's quiz at least once.

Completing a lesson should not automatically increase the user's ELO.

ELO represents competitive performance, not lesson completion.

Lesson completion and quiz results can contribute to learning statistics and progression.

---

## 5. Feature Two: Solo Quizzes

Each lesson has a solo quiz that tests the user's understanding of the concept just explained.

The quiz is independent of ranked Brawl duels.

Its purpose is to reinforce learning and help users identify misunderstandings before competing.

### Example

Lesson: HTTP Status Codes.

After completing the lesson, the user starts a short quiz.

Question:

> An authenticated user attempts to access an administrative endpoint but does not have the required permissions. Which HTTP status code is generally appropriate?

Options:

- 200 OK
- 401 Unauthorized
- 403 Forbidden
- 500 Internal Server Error

After submitting an answer, the user receives:

- Correct or incorrect feedback.
- The correct answer.
- A concise explanation.
- A brief explanation of why the most plausible incorrect answer is wrong.

### Quiz behavior

Solo quizzes should:

- Be tied to a specific lesson.
- Contain questions about that lesson's concept.
- Allow the user to answer independently.
- Provide useful feedback.
- Record completion and performance.
- Allow the user to retry.

Quiz questions should focus on the concept explained in the lesson.

They should not introduce several unrelated concepts without explanation.

For the initial version, quizzes use multiple-choice questions.

Additional formats can be introduced later if they provide meaningful learning value.

### Relationship to ELO

**Solo quizzes do not change ELO.**

ELO is earned or lost only through duels.

This distinction is important because a user should be able to learn, experiment, and make mistakes without risking their competitive rating.

---

## 6. Feature Three: Brawl — 1v1 Duels

Brawl is the competitive part of DevBrawl.

Two real players compete against each other in real time by solving the same technical challenges.

Unlike solo quizzes, Brawl challenges are designed to test practical understanding, investigation, diagnosis, and decision-making.

### Duel structure

Every duel has **exactly 5 rounds**, one round for each challenge type:

| Round | Challenge type |
|---|---|
| 1 | A. Concept Quiz / Choose the Trade-off |
| 2 | B. Code Investigation |
| 3 | C. Fix the Bug |
| 4 | D. Follow the Request |
| 5 | E. Log Analysis |

Each challenge belongs to one technical category. **(Default)** For each round, the server picks a random challenge of that round's type from any category, so a single duel usually touches several categories.

When a round is completed, its outcome affects each player's ELO in that challenge's category only.

A duel is therefore both a competition and an opportunity to test knowledge across different areas of software engineering.

### Matchmaking

- **(Default)** A single matchmaking queue. A player clicks "Find duel" and waits; the first two waiting players are matched together.
- Matching by ELO range is not required for the hackathon.
- A player can leave the queue at any time before a match is found.
- A player can be in at most one queue or duel at a time.

### Match flow

1. The player enters Brawl and joins the matchmaking queue.
2. The server matches them with another waiting player.
3. Both players see who their opponent is (nickname and relevant ratings) and the match begins.
4. Both players receive the same challenge at the same time.
5. Each player submits an answer. A player cannot change an answer after submitting it.
6. The round ends when both players have submitted or the round timer runs out. No answer counts as incorrect. The time limit depends on the challenge type (see "Round time limits" below).
7. The server determines the round outcome and both players see it, including the correct answer and the opponent's result.
8. The duel advances to the next round.
9. After all 5 rounds, the server finalizes the duel, updates ratings and XP, and both players see the results screen.

### Round time limits

Each challenge type has its own time limit, because the types take different amounts of effort. A quick Concept Quiz needs far less time than inspecting several files in a Code Investigation.

The exact values are **not decided yet**. They must be configurable per challenge type (not hardcoded in the duel logic), so we can tune them without code changes to the duel flow.

| Challenge type | Time limit |
|---|---|
| A. Concept Quiz / Choose the Trade-off | TBD (short, around 30 s) |
| B. Code Investigation | TBD (long, around 2–3 min) |
| C. Fix the Bug | TBD |
| D. Follow the Request | TBD |
| E. Log Analysis | TBD |

The client always shows the current round's remaining time, based on the limit the server sends at the start of each round.

### Server authority

The server is the single source of truth for a duel:

- The server picks the challenges, keeps the round timer, and records submission times.
- The correct answers are never sent to the client before the round ends.
- The server calculates all round outcomes, ELO changes, and XP. The client only displays them.

### Disconnects

The duel clock never stops: each round's time runs out whether or not both players are connected.

- A player who disconnects can reconnect at any time and continues with the round that is currently running.
- If they don't answer a round before its time runs out, that round counts as unanswered (incorrect) for them.
- A round still ends early only when both players have answered. The connected player waits for the timer if the opponent is away.
- If a player never comes back, the remaining rounds time out one by one and the duel is finalized normally.

---

## 7. Brawl Challenge Types

Brawl uses five different challenge types.

Each type should have a distinct purpose and interaction.

### A. Concept Quiz / Choose the Trade-off

The user answers a question about a technical concept or makes an engineering decision in a realistic scenario.

Example:

> Which approach is most appropriate when an API must prevent a user from accessing another user's private data?

The answer options should represent plausible technical approaches, not obviously absurd choices.

This type tests understanding and engineering judgment.

### B. Code Investigation

The user inspects a simulated codebase to identify where a problem originates.

The challenge presents:

- An incident description.
- A set of files.
- Relevant code snippets.
- A question about the location or cause of the problem.

Example:

A profile endpoint returns 401 even though login succeeds.

The user can inspect the API client, authentication context, profile page, and backend middleware.

They must identify that the frontend request does not include the required access token.

The central objective is to find the source of the problem by investigating the code.

### C. Fix the Bug

The user is presented with a problem and must select the change that correctly fixes it.

Example:

An application performs a separate database query for every user displayed on a page.

The user must select an appropriate solution to reduce unnecessary queries.

After answering, the application displays the simulated outcome and explains why the fix works.

The central objective is to identify the correct solution.

### D. Follow the Request

The user must arrange the steps of a request or system process in the correct order.

Example:

Arrange the steps of an authenticated API request:

1. The frontend sends a request.
2. The server receives the request.
3. Authentication middleware validates the token.
4. The route handler processes the request.
5. The server returns a response.

The steps are shown to the user in a shuffled order.

**(Default)** The answer is correct only if the entire order is correct. There is no partial credit.

The central objective is to understand the flow of data through a system.

### E. Log Analysis

The user examines logs from a simulated application and identifies the root cause of an incident.

Example:

```
10:42:11 INFO  POST /api/login 200
10:42:12 INFO  Access token issued
10:42:14 INFO  GET /api/profile 401
10:42:14 WARN  Authorization header missing
10:42:14 INFO  Request rejected by authentication middleware
```

The user must determine which evidence explains the failure.

The central objective is to distinguish symptoms from root causes and draw conclusions from technical evidence.

### Important distinction between challenge types

- **Concept Quiz** tests conceptual understanding and technical decisions.
- **Code Investigation** asks where the problem originates.
- **Fix the Bug** asks how to solve the problem.
- **Follow the Request** tests understanding of system flow.
- **Log Analysis** asks what happened and what the evidence reveals.

Do not make all five types look or behave like ordinary multiple-choice questions.

---

## 8. Feature Four: Category-Specific ELO

Every user has an independent ELO rating for every technical category.

For example:

| Category | ELO |
|---|---|
| APIs & Networking | 1350 |
| Databases | 1080 |
| Security | 1420 |
| Debugging | 1510 |
| System Design | 1190 |
| Infrastructure | 950 |

These ratings measure competitive performance within each category.

### How ELO works

Use the standard Elo rating calculation.

The amount gained or lost depends on the ratings of both competitors and the result of the round.

Beating a stronger opponent should reward more ELO than beating a much weaker opponent.

Losing to a weaker opponent should result in a larger rating loss than losing to a stronger opponent.

Each challenge has one primary category.

Only that category's rating changes as a result of the round.

Example:

A user wins an Infrastructure round.

Their Infrastructure ELO increases.

Their ratings in Security, Databases, and Debugging remain unchanged.

A user who loses a Security round should not lose Database ELO.

Solo lessons and quizzes never change ELO.

### Round outcome

| Player A | Player B | Outcome | ELO change |
|---|---|---|---|
| Correct | Incorrect | A wins the round | Yes |
| Incorrect | Correct | B wins the round | Yes |
| Correct | Correct | The faster submission wins the round | Yes |
| Incorrect | Incorrect | No winner | **No ELO change** |

Unanswered (timed out) counts as incorrect.

If both players answer correctly with exactly the same submission time, the round is a draw (score 0.5 each).

The application prioritizes correctness over speed. Speed only breaks ties between two correct answers. A fast incorrect answer never beats a correct answer.

### Formula (default)

- Starting rating: **1000** in every category.
- K-factor: **32**.
- Expected score: `E_A = 1 / (1 + 10^((R_B - R_A) / 400))`
- New rating: `R_A' = R_A + K * (S_A - E_A)`, where `S_A` is 1 for a win, 0.5 for a draw, and 0 for a loss.
- Round the rating change to a whole number.

**(Default)** Ratings are calculated from the players' ratings at the start of the duel and applied together when the duel is finalized. This keeps the result the same regardless of round order when two rounds share a category.

### Rank tiers (default)

| Tier | ELO |
|---|---|
| Beginner | below 900 |
| Bronze | 900–1099 |
| Silver | 1100–1299 |
| Gold | 1300–1499 |
| Platinum | 1500–1699 |
| Diamond | 1700–1899 |
| Master | 1900–2099 |
| Grandmaster | 2100 and above |

Display the numerical rating alongside the tier.

The rating is the primary measure; the tier is a visual representation of progression.

---

## 9. Feature Five: Match Results and Feedback

After a duel, display a results screen containing:

- The user's result.
- The opponent's result.
- The final match score (rounds won by each player).
- The number of correct answers.
- The challenges completed.
- The time taken.
- ELO changes by category.
- XP earned.
- Explanations for the challenges.
- An option to review incorrect answers.
- An option to start another duel.

**(Default)** The duel winner is the player who won more rounds. If both won the same number of rounds, the duel is a draw.

The results screen should make it obvious that a match can affect multiple categories independently.

Example:

| Category | Result | ELO change |
|---|---|---|
| Security | Win | +18 |
| Databases | Loss | -12 |
| Debugging | Win | +15 |

These values are illustrative. Actual changes must come from the rating calculation.

A finished duel is stored, so it appears in match history and its results can be reviewed later.

---

## 10. Feature Six: XP and Player Progression

XP is separate from ELO.

ELO measures competitive skill. XP represents participation and learning activity.

Users can earn XP by:

| Activity | XP (default) |
|---|---|
| Completing a lesson's quiz for the first time | 30 |
| Each correct answer in a duel | 10 |
| Finishing a duel | 50 |
| Winning a duel (bonus) | 50 |

XP contributes to the user's overall level. **(Default)** Advancing from level `n` to level `n + 1` requires `100 * n` XP.

The profile should show:

- Current level.
- Total XP.
- Progress toward the next level.
- Lessons completed.
- Quizzes completed.
- Duels played.
- Ranked wins.

XP rewards must be awarded consistently and must not be duplicated by repeated submissions or page refreshes. Retrying a quiz never awards its XP again.

XP must not be used as a replacement for category-specific ELO.

---

## 11. Feature Seven: Dashboard

The dashboard is the main entry point into DevBrawl.

It should help users continue learning and quickly access competitive play.

Include:

### Learning overview

- Recently completed lessons.
- Lessons in progress.
- Recommended next lessons.
- Learning progress by category.

### Competitive overview

- ELO rating in each category.
- Recent duel results.
- Recent rating changes.
- Current rank tiers.

### Suggested activities

- Recommend a lesson when the user has not learned a relevant concept.
- Recommend a duel when the user wants to test their knowledge.

For example, a user with low Database ELO and incomplete Database lessons could be encouraged to review a relevant lesson before entering a duel.

Recommendations should be simple and understandable.

### Main actions

Provide clear ways to:

- Continue learning.
- Browse categories.
- Start a duel.
- Review recent results.

---

## 12. Feature Eight: Leaderboards

Leaderboards provide a competitive incentive to improve.

Support category-specific leaderboards.

Examples:

- Best Security players.
- Best Database players.
- Best Debugging players.

Each leaderboard entry should display:

- Position.
- Player name.
- ELO rating.
- Rank tier.

An overall leaderboard may also be provided. **(Default)** It ranks players by their average ELO across all categories, and the page states this clearly.

Do not imply that an average rating captures every aspect of a player's technical ability.

For the demo, seeded fictional players are added to the leaderboards so they don't look empty. Real registered players appear alongside them.

---

## 13. Feature Nine: Player Profile

The profile brings together learning progress and competitive performance.

It should show:

- Player name and avatar.
- Level and XP.
- ELO rating for each category.
- Rank tier for each category.
- Completed lessons.
- Solo quiz performance.
- Match history.
- Ranked wins and losses.
- Accuracy statistics.
- Strongest and weakest categories.
- Achievements, if implemented.

Learning and competitive statistics should remain distinct.

For example, a user may have completed every Security lesson but still have a relatively low Security ELO because they have not performed well in duels.

This is expected: knowing the material and demonstrating skill in competition are related but different things.

---

## 14. Content and Challenge Design

Lessons and duel challenges should be written carefully.

- Lessons teach a specific concept.
- Solo quizzes test that concept.
- Brawl challenges test the user's ability to apply related concepts in practical situations.

These experiences should complement each other without being identical.

For example:

- **Lesson:** Authentication vs. Authorization.
- **Solo quiz:** Identify the appropriate status code for a user who is authenticated but lacks permission.
- **Brawl Code Investigation:** Investigate why a protected endpoint returns 401.
- **Brawl Log Analysis:** Identify why requests are being rejected by authentication middleware.

The learning section establishes understanding; Brawl tests whether the user can apply it.

All technical content must be accurate and should have an unambiguous intended answer.

### Hackathon content

For the hackathon, content is hardcoded as seed data. It only needs to be enough to demonstrate every feature:

- All six categories exist.
- A few categories have a handful of lessons, each with a short quiz. The other categories may have few or no lessons.
- The challenge pool contains several challenges of each type (A–E), spread across categories, so that two duels in a row don't look identical and duels affect several categories.
- A set of seeded fictional players with varied ratings for the leaderboards.

All content is in English.

---

## 15. MVP Priorities

We have roughly 19 hours left. Do not attempt to implement the entire product in one step.

Build and validate one feature at a time.

A sensible implementation order is:

1. Database setup and the core data model (users, categories, ratings).
2. Registration and login.
3. Application layout and navigation.
4. Categories, lesson browsing, and lesson pages.
5. Solo quizzes, completion tracking, and XP.
6. Category-specific ELO model.
7. One complete Brawl challenge type.
8. Real-time 1v1 duel flow: matchmaking, rounds, timer, and finalization.
9. Remaining Brawl challenge types.
10. Match results and rating updates.
11. Dashboard, profile, and leaderboards.
12. Deployment to a public domain.
13. Additional lessons, challenges, and progression features.

The precise implementation order can change based on team decisions and dependencies.

Prioritize a working end-to-end experience over building many incomplete pages.

To let frontend and backend work in parallel, agree on each feature's API contract (endpoints, request and response shapes, SignalR events) before implementing it.

---

## 16. Stretch Goal: AI-Generated Questions

Not part of the MVP. Only if time allows after the core experience works end to end.

Idea: use an AI model to generate new quiz questions or Brawl challenges for a category, so content does not run out.

This must stay consistent with the hackathon theme: AI is used to create more opportunities to learn and practice, never to hand the user the answer.

Generated content must still have one unambiguous correct answer. The approach (live generation versus generating and reviewing content in advance) will be decided if we get to this feature.

---

## 17. Team Workflow

We are a team of three developers: two backend developers and one frontend developer.

We will implement DevBrawl feature by feature.

This document describes the overall product vision, not a request to implement every feature immediately.

When asked to implement a feature:

1. Understand how it fits into the overall product.
2. Identify its required behavior and dependencies.
3. Define the data and interactions it needs.
4. Implement only the requested feature and the minimum necessary supporting functionality.
5. Keep the implementation modular so the other team members can work independently.
6. Explain what was implemented and how to verify it.

Do not silently introduce unrelated features.

Use the technology stack defined in section 0. Do not introduce additional frameworks or services without agreeing on them first.

Do not overengineer future features.

The priority is to build a cohesive, functional MVP that demonstrates the complete DevBrawl concept.

---

## Final Product Vision

DevBrawl is a platform where developers first learn individual software engineering concepts through short lessons and solo quizzes, then test their practical knowledge in competitive 1v1 duels against other developers.

The learning system helps users acquire knowledge.

The Brawl system challenges them to apply it.

The category-specific ELO system gives them a competitive measure of their ability in different areas of software engineering.

**Learn concepts. Master categories. Challenge other developers.**
