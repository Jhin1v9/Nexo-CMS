import React from 'react';

/**
 * Fixture com problemas PROPOSITAIS e deterministicos (doc 09 §29-31):
 * - .wide-fixed: width fixo 500px => overflow horizontal em viewport 375px
 *   (overflow esperado: 500 - 375 = 125px, body margin 0).
 * - .nav-action: botao com label longo em container de 140px => wrapping.
 * - .item-list: lista para o perfil manyItems.
 * - <img>: presente para o perfil missingImage.
 */
export function App() {
  return (
    <main className="page">
      <h1 className="site-title">Nexo Fixture</h1>
      <nav className="nav-bar">
        <button type="button" className="nav-action">
          Gerenciar assinatura premium
        </button>
      </nav>
      <div className="wide-fixed">Barra fixa de 500px</div>
      <ul className="item-list">
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
      </ul>
      <img className="logo" src="/pixel.png" width="16" height="16" alt="pixel" />
    </main>
  );
}
