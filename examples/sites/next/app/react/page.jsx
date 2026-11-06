// A server component using the React wrapper. The wrapper is a client
// component ('use client'); on the server it renders the box, the description
// and the controls, and with ssrSvg the build-time drawing.
import { Inkling } from '../../vendor/inkling/inkling-react.js';
import { renderToSVG } from '../../vendor/inkling/inkling-node.js';

const source = `title "From React"
react: box "React"
server: round "Server"
react -> server : "renders"
step 1: react
step 2: server`;

export default function Page() {
  return (
    <main>
      <h1>React wrapper</h1>
      <Inkling source={source} paper="napkin" autoplay />
      <Inkling source={source} ssrSvg={renderToSVG(source, { idPrefix: 'ssr' })} />
    </main>
  );
}
