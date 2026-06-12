import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: true,
  treeshake: true,
  external: [
    'react',
    'react-dom',
    'three',
    '@react-three/fiber',
    '@react-three/drei'
  ],
});
