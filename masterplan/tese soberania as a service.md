TESE DE ARQUITETURA E CIBERSEGURANÇA: SOBERANIA COMO SERVIÇO (SaaS Invertido)
A integração desenfreada da Inteligência Artificial em infraestruturas centralizadas criou uma crise de autonomia digital. Historicamente, o modelo de "Sovereignty as a Service" oferecido pela Big Tech tem sido uma armadilha retórica (o chamado Sovereignty-washing), onde a infraestrutura fica na nuvem corporativa e as chaves de acesso são geridas por terceiros.
Para escalar o "Feed Center + Buggy" para as massas, devemos adotar uma abordagem de Soberania Digital Popular. O modelo de "SaaS Invertido" propõe que a plataforma forneça apenas o "Molde" (a lógica, o código e a orquestração), enquanto o utilizador retém a posse criptográfica e biológica absoluta do "Conteúdo" (os dados e as chaves).
Abaixo, detalho a arquitetura de sistemas distribuídos e o protocolo de segurança Web3 para operacionalizar esta visão.

--------------------------------------------------------------------------------
1. A Filosofia e Distribuição (GitHub + Vercel + Tunnels)
Para democratizar a soberania, o atrito técnico deve ser próximo de zero. O utilizador comum não fará a gestão de servidores Linux; ele usará plataformas Serverless de alto nível, mas com garantias matemáticas de que os seus dados estão seguros.
Distribuição via Vercel "1-Click Deploy"
Auditoria e Fork: O código do Buggy reside num repositório público no GitHub. O utilizador clica num botão "Deploy to Vercel" que automaticamente faz um Fork do repositório para a sua própria conta do GitHub e inicia o deployment na Vercel.
Isolamento de Variáveis: Durante o fluxo de deployment na Vercel, o utilizador insere as suas próprias variáveis de ambiente (Supabase URL, Anon Key e Tokens do Túnel). Estes segredos ficam confinados ao projeto do utilizador, totalmente isolados dos criadores do Buggy.
Interconexão Segura (O Cérebro Local vs. A Nuvem)
O Vercel (Frontend Serverless) precisa de comunicar com o "Cérebro" local (o Mac/PC do utilizador a correr o modelo Qwen via Ollama). Expor portas locais diretamente à internet é um risco crítico.
A Solução: Cloudflare Tunnels. Ao executar o daemon cloudflared no Mac, é estabelecida uma ligação de saída (outbound) encriptada para a edge da Cloudflare na porta 443. Isto ignora problemas de CGNAT (Carrier-Grade NAT) que os ISPs de rede doméstica costumam impor.
Segurança (Zero Trust): O túnel não é público. Configuramos o Cloudflare Access para exigir Service Tokens (Client ID e Client Secret). Apenas a aplicação Vercel do utilizador, que possui estes tokens injetados nos headers HTTP, pode interagir com o modelo Ollama local.
[ Diagrama Lógico: Interconexão ]
Smartphone (Browser) -> HTTPS -> [ Vercel Frontend ] 
                                        | (Injeta CF-Access-Client-Id/Secret)
                                        v
                                 [ Cloudflare Edge ] -> Autentica Service Token
                                        | (Túnel Outbound Seguro)
                                        v
                                 [ cloudflared ] (No Mac Local)
                                        | (Rede Local: 127.0.0.1:11434)
                                        v
                                 [ Ollama + Qwen ] (O Cérebro)

--------------------------------------------------------------------------------
2. Arquitetura de Encriptação Fracionada (O Core da Soberania)
A soberania falha se a base de dados (Supabase) for o ponto único de falha. O Supabase atuará apenas como um livro-razão de "lixo matemático", impossível de ler sem a permissão do hardware local.
Zero-Knowledge via Split-Key Encryption
Não utilizamos uma única chave mestra. Aplicamos o princípio da Encriptação de Chave Dividida (Split-Key Cryptography) para mitigar o risco de extração.
Componente Cloud (K 
cloud
​	
 ): Uma string aleatória gerada no primeiro login e armazenada no Supabase.
Componente Hardware (K 
local
​	
 ): Um segredo gerado e armazenado apenas no dispositivo do utilizador (Secure Enclave, Mac Keychain ou IndexedDB).
Chave Operacional (K 
op
​	
 ): A chave de cifra final é obtida localmente através de uma operação bitwise XOR: K 
op
​	
 =K 
cloud
​	
 ⊕K 
local
​	
 .
O Fluxo Exato de um Registo (Ex: Despesa via Telegram)
Entrada e Processamento Local: O utilizador envia /gastos 50 EUR almoço para o Bot do Telegram. O webhook bate no Mac do utilizador (o "Cérebro" a correr localmente).
Reconstrução da Chave: O Mac recupera o seu K 
local
​	
  do Keychain e pede o K 
cloud
​	
  ao Supabase. Computa em memória: K 
op
​	
 =K 
cloud
​	
 ⊕K 
local
​	
 .
Encriptação Client-Side (Web Crypto API): O Mac utiliza a API criptográfica nativa (SubtleCrypto) para encriptar o JSON da despesa usando o algoritmo AES-256-GCM. É gerado um Vetor de Inicialização (IV) aleatório de 12 bytes.
Armazenamento Seguro: O texto cifrado (Ciphertext) e o IV são enviados para o Supabase. O Supabase regista apenas blobs opacos de dados em Base64.
Consumo no Telemóvel (Vercel Frontend): O utilizador abre a Web App no telemóvel. A app pede os dados cifrados ao Supabase. O browser fornece o K 
local
​	
  armazenado de forma não-extraível no IndexedDB (extractable: false). A Web Crypto API no browser reconstrói o K 
op
​	
 , desencripta o conteúdo em memória volátil e renderiza o ecrã. O texto em claro nunca toca no disco.
Nota de Cibersegurança: Nunca armazenamos chaves no localStorage. Este armazenamento é vulnerável a ataques XSS (Cross-Site Scripting) e expõe as chaves em texto limpo. O uso do IndexedDB com objetos CryptoKey marcados como não-exportáveis garante que, mesmo que um script malicioso corra na página, ele não pode extrair o material puro da chave.

--------------------------------------------------------------------------------
3. O Modelo "SaaS Invertido" e Recuperação de Contas
O paradigma do "SaaS Invertido" separa o software da posse da infraestrutura de dados. Nós facultamos o algoritmo (Buggy); o utilizador traz o hardware e a chave.
O Desafio Técnico (O Dilema da Recuperação): Num sistema Zero-Knowledge puro, se o utilizador perder o telemóvel e o PC (onde reside o K 
local
​	
 ), os dados estão perdidos para sempre, pois a empresa não possui uma funcionalidade de "Esqueci-me da Palavra-passe" capaz de ler a BD.
A Solução: BIP-39 Mnemonic Seed Phrases (Herança do Web3) Adotamos a norma criptográfica BIP-39 usada em carteiras de criptomoedas como o MetaMask.
Durante o setup inicial no Vercel, a interface gera uma frase de recuperação de 12 a 24 palavras (ex: apple globe ribbon zebra...) usando um Gerador de Números Pseudoaleatórios (CSPRNG).
O utilizador anota estas palavras num papel (armazenamento offline / físico).
Estas palavras representam até 256 bits de entropia, que através da função de derivação PBKDF2-HMAC-SHA512 geram uma Master Seed determinística.
A partir dessa semente, o K 
local
​	
  original é matematicamente deduzido.
Se o dispositivo arder num incêndio, o utilizador insere as 12 palavras num novo computador. O sistema regenera o K 
local
​	
 , vai ao Supabase buscar o K 
cloud
​	
 , e todos os dados são magicamente desbloqueados. Sem a frase, no entanto, é criptograficamente impossível reaver o acesso.

--------------------------------------------------------------------------------
4. Análise Crítica das Tecnologias
Tecnologia
Prós
Contras / Riscos
Vercel
Deployment sem atrito (1-click); Edge Network ultrarrápida; Gestão de segredos e domínios grátis.
É uma entidade centralizada (Serverless host). Solução: Nenhuma lógica de encriptação sensível depende dos servidores da Vercel; a WebCrypto corre no Client-side (browser do utilizador).
Supabase (RLS)
PostgreSQL robusto; Row Level Security (RLS) permite políticas de acesso restritas desde o endpoint.
Como base de dados relacional, requer schemas para pesquisa. Ao cifrar tudo, perdemos a capacidade de fazer SQL "Search" nativo. As pesquisas/filtros têm de ser feitas no frontend após a desencriptação em memória.
Cloudflare Tunnels
Evita abrir portas no router local do utilizador; Bypassa CGNAT; Autenticação robusta (Service Tokens).
Exige confiança no trânsito da Cloudflare se o TLS for terminado na edge. (Tailscale seria E2EE total, mas Cloudflare permite ao frontend da Vercel conectar-se facilmente sem necessitar de instalar VPN serverless).
WebCrypto API
Nativa em todos os browsers modernos; Muito rápida (suporte de hardware); Objetos CryptoKey não extraíveis previnem XSS.
Falta de contexto seguro se não houver HTTPS. Obriga a Vercel a servir via SSL (que é o default).

--------------------------------------------------------------------------------
5. User Journey: Zero à Soberania em 15 Minutos
Como é que um cidadão sem conhecimento profundo de programação ativa o seu SaaS Invertido?
Fase 1: O Cérebro Local (Mac/PC) - 5 Minutos
O utilizador descarrega e instala o Ollama no seu computador. Corre o comando ollama run qwen.
O utilizador instala o cloudflared (Cloudflare Tunnels) com um comando simples e liga-o a um domínio gratuito, apontando a rota para localhost:11434 (onde vive a IA).
Gera um Service Token na Cloudflare e guarda o Client ID e Client Secret.
Fase 2: O Espelho na Cloud (Supabase + Vercel) - 5 Minutos 4. O utilizador acede ao site oficial do projeto Buggy e clica no botão "Deploy to Vercel".