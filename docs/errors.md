# Diagnostics

`parse(source).diagnostics` lists problems with the source. Each one has:

| Field | Meaning |
| --- | --- |
| `code` | A stable code from the table below. Safe to match on. |
| `severity` | `error`: the line was skipped. `warning`: drawn anyway, but probably not what you meant. |
| `message` | What is wrong, in plain words. |
| `hint` | What to do, often "Did you mean …?" |
| `fix` | For typos: a `span` and replacement `text` that fix it. The playground's Fix button applies it. |
| `span` | Where it is: `line`, and `from`/`to` offsets into the whole source. |

The parser never throws. One bad line never changes how other lines are read.

| Code | Severity | Example that triggers it | Message |
| --- | --- | --- | --- |
| `E-UNCLOSED-STRING` | error | `a: box "oops` | This text is missing its closing quote. |
| `E-MISSING-VALUE` | error | `paper` | "paper" needs a value. |
| `E-UNEXPECTED` | error | `paper notebook extra` | Something is left over that does not belong there. |
| `E-UNKNOWN-PAPER` | error | `paper notbook` | No paper called "notbook". Suggests the closest name. |
| `E-UNKNOWN-PEN` | error | `pen markr` | No pen called "markr". |
| `E-UNKNOWN-HAND` | error | `hand cavet` | No handwriting called "cavet". |
| `E-UNKNOWN-LAYOUT` | error | `layout left` | Layout can be "right" or "down". |
| `E-BAD-MESS` | error | `mess 3` | Mess is a number from 0 (tidy) to 1 (chaotic). |
| `E-BAD-SEED` | error | `seed 1.5` | Seed is a whole number. |
| `E-ARROW-NEEDS-ENDS` | error | `a -> ` | An arrow needs a name on both sides. |
| `E-BAD-NAME` | error | `.com -> b` | Not a valid name; use letters, digits, - or _, or quotes. |
| `E-BAD-NODE` | error | `a: box "A" red extra` | Write a node as `a: box "Label"`. |
| `E-UNKNOWN-SHAPE` | error | `a: rectangel` | No shape called "rectangel". |
| `E-UNKNOWN-COLOR` | error | `a: box "A" yelow` | No colour called "yelow". |
| `E-DUPLICATE-NODE` | error | `a: box` twice | "a" is already defined on line N. The later one wins. |
| `E-NOTE-NEEDS-TEXT` | error | `note a` | A note needs text. |
| `E-UNKNOWN-TARGET` | error | `circle aple` | There is no node called "aple". |
| `E-UNKNOWN-LINE` | error | `papr notebook` | I don't understand this line. Suggests a keyword if one is close. |
| `W-STEP-UNKNOWN` | warning | `step 1: aple` | Step 1 names "aple", which is not a node. |

Every code has a test in `tests/parse.test.ts`. Adding a code means adding a row here and a test there.
