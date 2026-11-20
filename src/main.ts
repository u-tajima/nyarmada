import './style.css';
import { GameApp } from './ui/garage';

const root = document.getElementById('app');
if (root) {
  new GameApp(root);
}
