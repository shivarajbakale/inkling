export interface Example {
  id: string;
  name: string;
  blurb: string;
  source: string;
}

export const EXAMPLES: Example[] = [
  {
    id: 'dns',
    name: 'How DNS finds a website',
    blurb: 'Steps, notes and a circled key idea on notebook paper.',
    source: `title "How DNS finds a website"
paper notebook
pen ballpoint
hand caveat
mess 0.45
seed 7

you: person "You"
browser: box "Browser"
resolver: cloud "Resolver"
root: box "Root\\nserver"
tld: box ".com\\nserver"
site: db "example.com\\nname server"

you -> browser : types example.com
browser -> resolver : "where is it?"
resolver <~> root : "try .com"
resolver <~> tld : "try ns1"
resolver <-> site : 93.184.216.34

circle resolver @4
note resolver "remembers the answer\\nfor next time (TTL)" @4
highlight site yellow

step 1: you, browser "You type a name, not a number"
step 2: resolver, root "The resolver starts at the top"
step 3: tld, site "Each server points one level down"
step 4: "The answer is cached"
`,
  },
  {
    id: 'habit',
    name: 'The habit loop',
    blurb: 'A cycle on a napkin, drawn in marker.',
    source: `title "The habit loop"
paper napkin
pen marker
hand gochi
mess 0.6
seed 3
layout down

cue: circle "Cue"
craving: circle "Craving"
response: circle "Response"
reward: circle "Reward" yellow

cue -> craving : "notice it"
craving -> response : "want it"
response -> reward : "do it"
reward ~> cue : "learn it"

note cue "phone buzzes"
note reward "dopamine!"
underline reward

step 1: cue "Something triggers you"
step 2: craving "You want the change it brings"
step 3: response "You act"
step 4: reward "It feels good, so the loop gets stronger"
`,
  },
  {
    id: 'photosynthesis',
    name: 'Photosynthesis',
    blurb: 'A science lesson in chalk.',
    source: `title "Photosynthesis"
paper chalkboard
pen chalk
hand kalam
mess 0.5
seed 11

sun: circle "Sunlight" yellow
water: text "Water\\n(H2O)"
co2: text "Carbon dioxide\\n(CO2)"
leaf: cloud "Chloroplast\\nin the leaf" green
sugar: box "Glucose"
oxygen: text "Oxygen\\n(O2)"

sun ~> leaf
water -> leaf : roots
co2 -> leaf : air
leaf -> sugar : food
leaf -> oxygen : "breathed out"

circle leaf @3
note sugar "plants store it\\nas starch"
check oxygen

step 1: sun "Light is the energy source"
step 2: water, co2 "Raw ingredients come in"
step 3: leaf "The chloroplast does the work"
step 4: sugar, oxygen "Out comes food and oxygen"
`,
  },
  {
    id: 'refactor',
    name: 'Should I refactor this?',
    blurb: 'A decision tree on a whiteboard.',
    source: `title "Should I refactor this?"
paper whiteboard
pen marker
hand patrick
mess 0.35
seed 21
layout down

start: round "I hate this code"
tests: diamond "Has tests?"
soon: diamond "Changing it\\nsoon?"
write: box "Write tests first" yellow
leave: sticky "Leave it.\\nIt works."
go: box "Refactor in\\nsmall steps" green

start -> tests
tests -> write : no
write -> soon
tests -> soon : yes
soon -> leave : no
soon -> go : yes

cross leave
note go "one commit\\nper move"
`,
  },
  {
    id: 'oauth',
    name: 'Signing in with Google',
    blurb: 'An OAuth flow on blueprint paper.',
    source: `title "Sign in with Google (OAuth)"
paper blueprint
pen ballpoint
hand architect
mess 0.3
seed 5

user: person "You"
app: box "The app"
google: round "Google"
api: db "Your Google\\ndata"

user -> app : "clicks Sign in"
app -> google : "sends you to Google"
user <-> google : "log in + allow"
google --> app : "token"
app ~> api : "uses token"

highlight app
note google "the app never\\nsees your password"

step 1: user, app "You ask to sign in"
step 2: google "Google checks it's really you"
step 3: api "The app gets a token, not your password"
`,
  },
];

export const ARCHITECTURE = `title "How Inkling draws"
paper graph
pen pencil
hand kalam
mess 0.35
seed 4

src: sticky "Your text"
parse: box "Parser"
ast: round "Diagram\\nmodel"
layout: box "Layout\\n(dagre)"
human: box "Humaniser"
pen: box "Sketch pen\\n(rough.js)"
svg: cloud "SVG"
embed: round "<inkling-diagram>"
image: round "Image URL"
md: round "Markdown fence"

src -> parse -> ast -> layout -> human -> pen -> svg
svg -> embed
svg --> image
svg --> md

note human "wobble, tilt,\\nletter jitter"
note pen "seeded: same text,\\nsame drawing"
circle human

step 1: src, parse, ast "Text becomes a model"
step 2: layout, human "Boxes get placed, then roughed up"
step 3: pen, svg "A pen draws it stroke by stroke"
step 4: embed, image, md "Put it anywhere"
`;

export const EMBED_SAMPLE = `title "Cache-aside"
paper notebook
pen felt
mess 0.4
seed 9

app: box "App"
cache: round "Cache"
db: db "Database"

app -> cache : "1. look here"
cache --> app : "miss"
app -> db : "2. ask DB"
app ~> cache : "3. save it"

note cache "fast but small"
step 1: app, cache "Check the cache first"
step 2: db "Miss? Read the database"
`;
