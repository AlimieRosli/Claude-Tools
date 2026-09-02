# Shared: Topic Doc Path Derivation

Used by `topic-init`, `topic-plan`, and `topic-test` to derive doc paths once the module and topic names are resolved. This is a shared reference file, not a skill itself — it has no `SKILL.md` and is only loaded when linked from a skill's own rules file.

| Variable | How to derive | Example |
|----------|--------------|---------|
| `<MODULE>` | The resolved module name, kebab-case | `Google-API` |
| `<TOPIC>` | The resolved topic name, kebab-case | `My-Feature` |
| `<PREFIX>` | `<TOPIC>` uppercased, hyphens → underscores | `MY_FEATURE` |
| Target folder | `docs/ref/<MODULE>/<TOPIC>/` | `docs/ref/Google-API/My-Feature/` |
| Main doc | `<PREFIX>.md` | `MY_FEATURE.md` |
| Plan doc | `<PREFIX>_PLAN.md` | `MY_FEATURE_PLAN.md` |
| Test doc | `<PREFIX>_TEST.md` | `MY_FEATURE_TEST.md` |

> The example values above (`My-Feature`, `MY_FEATURE`) are placeholders for illustration only. Always substitute the actual resolved `<MODULE>` and `<TOPIC>` from the sources above.

*Adapt paths/commands to your repository's actual layout and tooling.*