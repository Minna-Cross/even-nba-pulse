import './styles.css';
import { mountDom } from './dom.js';
import { createApp } from './app.js';

const dom = mountDom();
const app = createApp(dom);

app.init();

window.addEventListener('beforeunload', () => {
  app.destroy();
});
