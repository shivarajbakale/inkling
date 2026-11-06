---
name: inkling
description: Write or fix Inkling diagrams (.inkling files, or ```inkling fences in Markdown). Inkling is a small text language that draws hand-drawn diagrams that animate step by step. Use it when asked to draw, sketch or explain something as a diagram in this repo, or to edit a .inkling file. Always run the checker until the file is clean.
---

# Writing Inkling diagrams

Inkling turns a few lines of text into a drawing that looks hand-made and can
draw itself step by step. One statement per line. `#` starts a comment.

## The loop: write, check, fix, repeat

1. Write the source to a `.inkling` file (for a Markdown fence, write the
   fence body to a scratch `.inkling` file first).
2. Run the checker:

   ```sh
   node bin/inkling.mjs check path/to/diagram.inkling
   ```

   It prints one problem per line as `file:line: severity: message [CODE]` and
   exits 1 if there are errors. Codes are listed in `docs/errors.md`. Most
   messages say what to do ("Did you mean "box"?").
3. Fix every error, and every warning unless it is intended (`W-WIDE` means the
   drawing is too wide: try `layout down`).
4. Run `check` again. **Repeat until it prints nothing and exits 0.** Do not
   hand the diagram back while it has errors.
5. Optionally tidy and draw it:

   ```sh
   node bin/inkling.mjs format path/to/diagram.inkling --write
   node bin/inkling.mjs render path/to/diagram.inkling -o diagram.svg
   ```

If `bin/inkling.mjs` says it cannot find `inkling-node.js`, run
`npm run build:lib` once. In a vendored copy it is `vendor/inkling/bin/inkling.mjs`.
`-` reads from stdin: `printf 'a -> b\n' | node bin/inkling.mjs check -`.

## The language

### Things (nodes)

```
api: box "API"                 # name: shape "Label"
db: db "Orders\nDB"            # \n breaks a label
user: person "You"
cdn: icon cloud "CDN"          # an icon instead of a shape
big: box "Big idea" size=large color=red pen=marker
hatch: box "Hatched" yellow    # a colour fills it with pencil hatching
```

- Shapes: `box`, `round`, `circle`, `diamond`, `cloud`, `db`, `sticky`,
  `person`, `text` (also `rect`, `square`, `ellipse`, `database`).
- Icons: person, server, database, cloud, phone, laptop, lock, key, mail, file,
  folder, gear, chart, globe, clock, bell, cart, card, chat, search, star,
  heart, bolt, bug, rocket, book, camera, code, link, check.
- Fill colours: yellow, pink, green, blue, orange, purple, red, gray.
- Ink colours (`color=`): red, blue, green, orange, purple, pink, gray, black.
- Options: `color=`, `pen=`, `size=small|normal|large`, `fill=`.
- A name you use in an arrow without defining it becomes a box labelled with the
  name. Quote names with spaces: `"Load balancer" -> api`.

### Arrows

```
a -> b                 # plain
a --> b                # dashed: replies, optional paths
a ~> b                 # squiggly: "eventually", "asks around"
a <-> b                # both ways (<~> both ways and squiggly)
a -> b -> c : "label"  # chain; the label goes on the last arrow
a -> b : "why" color=red pen=pencil
```

### Marks a teacher would make

```
circle api
underline api
strike api
highlight api pink           # yellow unless you name a colour
note api "slow!"             # margin note with an arrow
check api                    # tick; cross api for a cross
circle api @3                # draw the mark during step 3
circle app -> db             # marks work on arrows (by their two ends) …
circle backend               # … and on groups
```

### Groups

```
group backend "Backend" {
  api: round "API"
  worker: box "Worker"
  group data "Data" {        # one level of nesting at most
    db: db "Postgres"
  }
}
group edge "Edge" { cdn, lb }   # or list members on one line
```

### Steps (the draw-on animation)

```
step 1: user, app "You ask to sign in"     # names, then an optional caption
step 2: google "Google checks it's you"
step 3: backend                            # a group stands for its members
```

Or `steps auto`: every node is its own step, in source order. Arrows appear
once both ends exist.

### The look (settings, one per line, near the top)

```
title "How sign-in works"
paper notebook     # notebook, graph, whiteboard, napkin, blank, chalkboard, blueprint
pen ballpoint      # ballpoint, marker, pencil, felt, chalk
hand caveat        # caveat, kalam, patrick, gochi, architect
mess 0.4           # 0 tidy … 1 chaotic
seed 7             # same seed, same wobble
layout down        # right (default) or down
```

New layout names may exist in this repo (for example `layout timeline`); the
checker says which are valid.

## A complete example

```
title "Sign in with Google (OAuth)"
paper blueprint
pen ballpoint
seed 5

user: person "You"
app: box "The app"
google: round "Google"
api: db "Your Google\ndata"

user -> app : "clicks Sign in"
app -> google : "sends you to Google"
user <-> google : "log in + allow"
google --> app : "token"
app ~> api : "uses token"

highlight app
note google "the app never\nsees your password"

step 1: user, app "You ask to sign in"
step 2: google "Google checks it's really you"
step 3: api "The app gets a token, not your password"
```

More examples: `examples/gallery/*.inkling`, `examples/docs/*.inkling`.

## Good diagrams

- Keep it small: 3 to 9 nodes. Split a big idea into two diagrams.
- Labels are short: two to four words; put detail in a `note`.
- Use steps to tell the story in the order a reader should follow it.
- Use one mark (circle, highlight) for the single most important thing.
- More than about 7 things in a row: `layout down`.

## In Markdown

````md
```inkling paper=chalkboard autoplay height=320 alt="How light becomes sugar"
title "Photosynthesis"
sun ~> leaf : "light"
```
````

Fence options: any setting (`paper=`, `pen=`, `hand=`, `mess=`, `seed=`,
`layout=`), plus `autoplay`, `controls=none`, `height=`, `alt="…"` and
`mode=client|svg`. Check the fence body with the CLI the same way.
