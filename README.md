# Video editing test app

An example of how to edit a video using two controls: timeline slider and transcription entries.

This example uses FFMpeg for video editing. Since the Emscripten code cannot quite use the hardware acceleration, the video encoding is slow.
I recommend running it with the console open, so you can see the progress in ffmpeg logs.

## How to run it

This application was created using `create-vite`, so the setup should be a fairly standard. You just need to:

- Install dependencies (using either `yarn` or `npm`);
- Run it by either `yarn dev` or `npm run dev`;

## Credits

This example uses original Mozilla's video about ChatGPT, so feel free to [check it out on YouTube](https://www.youtube.com/watch?v=ll_Sb8eIkPc).

---

> Below come the original Vite app docs

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
