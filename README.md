# Central de Produção

A **Central de Produção** é uma extensão para Adobe Photoshop que reúne ferramentas usadas na finalização de páginas de mangás, manhwas e outros projetos gráficos.

Em um único painel, é possível aplicar marcas d’água, adicionar capas, preparar camadas e exportar páginas abertas.

## Funcionalidades

### Marca d’água

- Aplica uma marca à página atual ou a todas as páginas abertas.
- Oferece perfis para **logo lateral**, **banner grande** e configuração personalizada.
- Permite ajustar tamanho, posição, margem e opacidade.
- Pode ignorar as margens transparentes do arquivo da marca.
- Permite pular, substituir ou adicionar uma marca quando já existe uma no documento.
- Inclui uma opção para remover marcas criadas pela ferramenta.

### Capas

- Adiciona uma capa inicial acima da página e uma capa final abaixo.
- Permite escolher as páginas que receberão cada capa.
- Ajusta a capa proporcionalmente à largura da página e amplia a tela para acomodá-la.

### Preparação e exportação

- Duplica a imagem-base das páginas abertas.
- Mescla camadas desbloqueadas em uma camada chamada `redraw`, mantendo as camadas bloqueadas separadas.
- Salva as páginas abertas em PSD.
- Exporta páginas em **JPG**, **PNG** ou **WebP**, com opções de qualidade e conversão para sRGB.
- Exibe progresso e relatório durante operações em lote.

## Requisitos

- Windows.
- Adobe Photoshop **2019 ou posterior**, com suporte a extensões CEP.
- Para exportar em WebP no Photoshop 2019 ou 2021, é necessário ter o **WebPShop** instalado. Versões mais recentes do Photoshop podem usar o suporte nativo.

## Instalação

1. Baixe o pacote completo na seção **Releases**.
2. Extraia o ZIP.
3. Feche o Photoshop.
4. Execute **`Instalar.cmd`** e siga as instruções.
5. Abra o Photoshop e acesse **Janela > Extensões (herdadas) > Central de Produção**.

Mantenha a pasta `Central_Producao` e os arquivos do instalador juntos após a extração.

## Como usar

### Aplicar uma marca d’água

1. Abra a aba **Marca**.
2. Escolha o arquivo da marca.
3. Selecione um perfil e ajuste tamanho, posição, margem e opacidade.
4. Escolha se deseja aplicar à página atual ou a todas as páginas abertas.
5. Clique em **Aplicar marca d’água**.

### Adicionar capas

1. Abra a aba **Capas**.
2. Escolha a capa inicial, a capa final ou ambas.
3. Selecione as páginas de destino.
4. Clique em **Adicionar capas**.

Para aplicar capas, a página precisa ter uma cópia de imagem desbloqueada. Se necessário, use **Duplicar imagem-base** na aba **Páginas**.

### Preparar e exportar páginas

1. Abra a aba **Páginas**.
2. Se necessário, duplique a imagem-base ou mescle as camadas desbloqueadas em `redraw`.
3. Escolha a pasta de destino, o formato e as opções de cor.
4. Clique em **Salvar todas em PSD** ou **Exportar todas as páginas**.

A exportação de imagens trabalha em cópias temporárias. O botão de cancelamento interrompe o lote após a página em processamento.

## Observações

- A mesclagem em `redraw` pode incluir camadas de texto e grupos desbloqueados, não apenas camadas de imagem. Confira o resultado antes de salvar.
- As capas e marcas alteram os documentos abertos. Revise o resultado antes de salvar os arquivos finais.
- Faça uma cópia de segurança dos seus documentos antes de processar um lote.
