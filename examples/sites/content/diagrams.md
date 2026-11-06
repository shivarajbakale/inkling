# Diagrams in Markdown

Every fixture site builds this page. The checks in `tests/sites.test.ts` count
what comes out.

## Drawn in the browser

```inkling autoplay alt="A request and its response"
title "Request, then response"
browser: box "Browser"
server: round "Server"
browser -> server : "GET /"
server --> browser : "200 OK"
```

## Drawn at build time

```inkling mode=svg paper=chalkboard
title "Photosynthesis"
sun: cloud "Sun"
leaf: box "Leaf"
sun ~> leaf : "light"
```

## A source that tries to escape

```inkling paper=napkin
a: box "</inkling-diagram><script>alert(1)</script>"
b: box "'single' & \"double\""
a -> b
```

## Not a diagram

```js
const html = '<inkling-diagram>';
```
