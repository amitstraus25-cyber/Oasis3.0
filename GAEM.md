# NHI Fixer

A 2D top-down pixel art browser game about securing Non-Human Identities in the office. Open `index.html` to play.

**Controls:** WASD/Arrows to move, SPACE to remediate NHI issues.  
**Goal:** Remediate all 9 NHI security issues before the 3-minute timer runs out.

## NHI Security Issues

Each desk represents a Non-Human Identity (service account, bot, agent, workload). The 9 issues to fix:

1. **Credential Leak** - leaked key with spilled secrets
2. **Security Breach** - active threat with broken shield
3. **Expired Certificate** - document with red EXPIRED stamp
4. **Stale API Token** - dusty, cracked token with cobwebs
5. **Permission Conflict** - clashing shields with lightning
6. **Unrotated Secret** - stuck key that won't rotate
7. **Dormant Identity** - sleeping user silhouette with Zzz
8. **Secret Sprawl** - keys spreading uncontrolled
9. **Log Overflow** - terminal spewing error lines

You are the NHI fixer in the Oasis t-shirt. Navigate the cubicle maze, find the red-circled issues, and press SPACE to remediate them. Each desk shows its NHI name (e.g., `svc-deploy`, `agent-k8s`) and monitors turn red when compromised.
