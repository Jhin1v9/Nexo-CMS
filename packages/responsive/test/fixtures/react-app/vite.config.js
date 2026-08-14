// Fixture do Responsive Lab: cacheDir fora de node_modules para que testes
// possam usar node_modules via symlink sem colisao de cache entre copias.
// '.cache' e excluido do hash de integridade do source (source-hash.ts).
export default {
  cacheDir: '.cache/vite',
};
