import type { ThreeElements } from "@react-three/fiber";

// React 19 moved JSX types into the "react" module: let <mesh>, <group>… type-check.
declare module "react" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends ThreeElements {}
  }
}
