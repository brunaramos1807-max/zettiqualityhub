# QualiVisão Brand Assets

Arquivos de identidade visual oficial da plataforma QualiVisão v1.

## Assets Inclusos

### Logos
- `qualivisao-logo-horizontal.svg` - Logo horizontal (colorido, navy + teal)
- `qualivisao-logo-horizontal-white.svg` - Logo horizontal versão branca
- `qualivisao-logo-monochrome.svg` - Logo monocromática (preto)

### Símbolo
- `qualivisao-symbol.svg` - Símbolo isolado (colorido)
- `qualivisao-symbol-white.svg` - Símbolo versão branca

### Favicon e Ícones
- `qualivisao-favicon.svg` - Favicon vetorial
- `qualivisao-app-icon-192.png` - Ícone de app 192×192px
- `qualivisao-app-icon-512.png` - Ícone de app 512×512px

## Cores Oficiais

- **Navy Profundo**: `#0B1D2D` - Cor primária corporativa
- **Navy Secundário**: `#183B50` - Tons secundários
- **Teal Principal**: `#0FA08D` - Cor de destaque/acento
- **Off-White**: `#E6F1EE` - Texto sobre fundos escuros

## Uso

Não duplicar logos em várias pastas do projeto. Todos os assets devem ser referenciados a partir de `/public/brand/qualivisao/`.

### Importação em Componentes
```tsx
import Logo from '@/public/brand/qualivisao/qualivisao-logo-horizontal.svg';
```

### Uso em HTML
```html
<img src="/brand/qualivisao/qualivisao-symbol.svg" alt="QualiVisão" />
```

## Design Tokens

Ver `/app/styles/theme/brand-tokens.css` para as variáveis CSS da marca.

## Versão
- v1.0 - Identidade visual base aprovada (2025-07-15)

## Notas
- Não usar imagens raster diretamente. Preferir SVG para logos e símbolos.
- App icons em PNG devem ser usados apenas para manifest.json e ativos de sistema operacional.
- Manter proporção e espaçamento conforme definido nas guidelines da marca.
