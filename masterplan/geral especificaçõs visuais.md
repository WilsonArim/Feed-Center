Design System & Marketing Blocks Architecture - Feed-Center (SOTA 2026)
1. Core Experience (Motor Visual)
O elemento central que define a identidade "Organic Digitalism" e a profundidade Z-Axis da aplicação.
• Componente: Serafim (Splite)
◦ Referência/URL: 21st.dev/community/components/serafim/splite/default (Referenciado no conceito da Peça Central).
◦ Descrição Visual: Um "Digital Companion" 3D que não é estático. Funciona como um motor de engajamento que persiste entre transições de secção.
◦ Comportamento: Reage ao tracking do rato para criar "contacto visual direto" e profundidade. Altera o seu estado (animação/cor) com base em eventos de dados (ex: "Idle", "Observing", "Happy", "Worried").
◦ Integração: Mistura-se com o fundo HTML através de um overlay de gradiente para eliminar a sensação de "iframe quadrado".
2. Estrutura e Navegação (Layout Blocks)
Blocos estruturais focados em Glassmorphism e micro-interações magnéticas.
• Componente: Floating Glass Island (Navbar)
◦ Categoria: Navigation / Headers.
◦ Descrição Visual: Uma "ilha" ou pílula flutuante, centralizada, com efeito frosted glass (backdrop-filter: blur).
◦ Animação: Ícones que escalam magneticamente quando o cursor se aproxima. Transições de layout geridas via framer-motion (layoutId).
◦ Adaptação: No mobile, converte-se num menu "Hambúrguer" expansível; no desktop, mantém-se visível.
• Componente: Sidebar Collapsible
◦ Categoria: Navigation / Sidebars.
◦ Descrição Visual: Menu lateral expansível que permite fixar itens (pin).
◦ Comportamento: Transições suaves entre estados (expandido/colapsado) e highlight visual no item ativo.
3. Apresentação de Conteúdo (Marketing Blocks)
Blocos semitransparentes desenhados para não obstruir o elemento 3D, utilizando scroll e revelação progressiva.
• Componente: Bento Grid Flutuante
◦ Categoria: Features / Grids.
◦ Referência: Categoria Features do 21st.dev.
◦ Descrição Visual: Substitui listas tradicionais. É um grid irregular (estilo Bento Box) que flutua sobre o fundo.
◦ Animação (Scroll-Linked): Ao fazer scroll, o objeto 3D (Serafim) faz "Zoom out" e move-se para a direita, enquanto os cartões do grid entram pela esquerda com uma animação staggered (sequencial).
• Componente: Infinite Marquee Rail
◦ Categoria: Testimonials / Social Proof.
◦ Descrição Visual: Um scroll horizontal infinito contendo cartões (Testemunhos ou Clientes).
◦ Efeito de Profundidade: Passa por trás ou pela frente do elemento 3D central, criando camadas de profundidade (Parallax).
◦ Estilo: Os cartões possuem bordas brilhantes geradas por Shaders.
4. UI Atoms & Interatividade (Interactive Components)
Componentes de interação direta que substituem o comportamento padrão do browser por física e texturas orgânicas.
• Componente: Liquid Shader Button
◦ Categoria: UI / Buttons.
◦ Referência: Categoria Shaders do 21st.dev.
◦ Descrição Visual: Botões com textura "líquida". Ao clicar, a superfície ondula como água, eliminando a sensação estática de botões sólidos.
• Componente: Elastic Spring Modal
◦ Categoria: Dialogs / Modals / Popovers.
◦ Descrição Visual: Janelas de diálogo que não usam fade-in. Elas "nascem" a partir do botão de origem expandindo-se elasticamente.
◦ Física: Utiliza Spring Animations (alta rigidez, amortecimento controlado) para dar peso e tatilidade à interface.
• Componente: Spotlight Cursor & Input
◦ Categoria: Effects / Cursor.
◦ Descrição Visual: O cursor padrão desaparece. É substituído por um "Spotlight" subtil que ilumina o fundo (revelando texturas noise) ou foca o brilho atrás do texto ativo (inputs).
5. Atmosfera e Efeitos (Shaders & Backgrounds)
Efeitos globais para garantir a estética "SOTA 2026" e legibilidade em modo escuro (Deep Void).
• Componente: Gradient/Moving Borders
◦ Categoria: Effects / Borders.
◦ Descrição Visual: Bordas luminosas e animadas ao redor de cartões (To-Do, Financeiro). Substituem as bordas cinzentas sólidas para guiar o olho no escuro sem excesso de contraste.
• Componente: Noise Texture Overlay
◦ Categoria: Backgrounds / Textures.
◦ Descrição Visual: Shader de granulação subtil aplicado no fundo de Modais e Blocos. Reduz o banding de cores e confere uma textura de "papel de alta gramatura".
• Componente: Kinetic Typography
◦ Categoria: Typography.
◦ Descrição Visual: Títulos que reagem ao scroll, alterando o seu peso (font-weight) ou espaçamento (tracking) para transmitir sensação de velocidade e aceleração.