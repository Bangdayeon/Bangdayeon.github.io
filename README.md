# room

개발 · 기획 · 리뷰 · 인스타툰 · 여행 기록을 쌓는 개인 아카이브.
목적 우선순위: **아카이빙 > PR > 포트폴리오**.

## 요구사항

- Node.js >= 20.11
- pnpm 10

## 시작하기

```bash
pnpm install
cp .env.example .env.local   # 값 채우기
pnpm dev                     # http://localhost:3000
```

## 스크립트

| 명령                           | 설명                        |
| ------------------------------ | --------------------------- |
| `pnpm dev`                     | 개발 서버 (Turbopack)       |
| `pnpm index`                   | 콘텐츠 검증 + 색인 생성     |
| `pnpm img`                     | 이미지 R2 업로드            |
| `pnpm font`                    | 폰트 서브셋 생성            |
| `pnpm build`                   | 정적 내보내기 → `out/`      |
| `pnpm build:server`            | 서버가 있는 곳용 빌드       |
| `pnpm start`                   | 빌드 결과 실행              |
| `pnpm lint`                    | ESLint (prettier 규칙 포함) |
| `pnpm lint:fix`                | ESLint 자동 수정            |
| `pnpm typecheck`               | `tsc --noEmit`              |
| `pnpm format` / `format:check` | Prettier                    |

## 구조

```
src/
├─ app/
│  ├─ sitemap.ts · robots.ts     검색엔진에 내보내는 두 파일 ([lng] 밖 — 사이트에 하나뿐이다)
│  └─ [lng]/
│     ├─ layout.tsx · not-found.tsx
│     └─ (route)/
│        ├─ page.tsx                 /
│        ├─ [category]/page.tsx      /{category}
│        ├─ [category]/[...rest]/page.tsx
│        │                            글 · 하위 카테고리 목록 · 쪽 넘김
│        ├─ tags/page.tsx · tags/[tag]/page.tsx
│        ├─ archive/page.tsx
│        └─ search/page.tsx           검색 · 최근 검색 · 태그 · 글 그래프
├─ components/ lib/ styles/ types/
├─ config/     images.json(★커밋 필수) · tag-alias.ts · id-redirects.json · nav.ts · site.ts
├─ content/    MDX 정본 (Obsidian vault 겸용). 카테고리 = 폴더, 하위 카테고리 = 폴더 안의 폴더
└─ data/       빌드 산출물 (gitignore)

public/        Next 제약으로 루트 고정
scripts/       build-index.ts (pnpm index) · upload-image.ts (pnpm img)
               build-static.ts · export-fixup.ts (pnpm build) · subset-font.ts
docs/          상세 명세
```

경로 별칭은 `@/*` → `./src/*` 하나뿐입니다 (`@/lib/cn`, `@/config/tag-alias`).

파일명 `YYYY-MM-DD-slug.mdx` → URL `/{category}/{slug}` (날짜 미포함).
카테고리 폴더 안에 폴더를 더 파면 하위 카테고리가 됩니다 —
`dev/nextjs/2026-08-20-slug.mdx` → `/dev/nextjs/slug`. 깊이 제한은 없습니다.

## 글 쓰기

`src/content/`가 곧 Obsidian vault입니다. 별도 변환이나 업로드 단계가 없습니다.
템플릿과 문법 · 검증 오류 대처는 **[docs/writing.md](docs/writing.md)** 에 있습니다.

1. `src/content/<카테고리>/YYYY-MM-DD-slug.mdx` 생성
2. frontmatter 다섯 개를 채운다. 미완성이면 `draft: true`로 둔다
3. `pnpm dev` — 파일을 고치고 새로고침하면 바로 보인다 (watch 프로세스 없음)
4. 다 쓰면 `draft: false` → git push

**`draft`는 로컬에서만 보입니다.** 프로덕션 색인에 아예 굽지 않으므로 URL을 직접 쳐도 404입니다.

**콜아웃**은 Obsidian 문법 그대로 다섯 종류 — `note` `tip` `warning` `danger` `quote`.
나머지 종류는 뜻이 가까운 것으로 접히고 빌드 로그에 남습니다.

```md
> [!tip] 제목은 없어도 된다
> 본문. [[2026-08-11-slug]] 또는 [[2026-08-11-slug|별칭]] 으로 다른 글을 잇는다.
```

목록의 출처는 환경마다 다릅니다 — dev는 `src/content` 직독,
프로덕션 빌드는 `pnpm index`가 구운 `src/data/index.json`입니다.
어느 쪽이든 화면은 `src/lib/posts.ts` 하나만 봅니다.

## 폰트

본문은 Pretendard 가변 폰트 하나만 씁니다. 코드는 시스템 mono 스택이라 파일이 없습니다.
쓰는 굵기는 **400 · 500 · 600 · 700** 네 단계뿐입니다 (기울임 없음).

`public/fonts/PretendardVariable.subset.woff2` 만 커밋합니다. 다시 만들려면 배포본의
`PretendardVariable.woff2`(2MB)를 같은 폴더에 두고 `pnpm font` — 굵기 축을 400~700 으로
좁히고 한글 완성형 · 라틴 · 문장부호만 남겨 절반 아래로 깎습니다. 한자는 빠져 있습니다
(2만 자가 넘어 파일이 도로 커집니다. 필요하면 `scripts/subset-font.ts`의 범위를 켜세요).

## 배포

GitHub Pages 에 정적 파일로 올린다. `main` 에 push 하면 워크플로가 굽는다.
서버가 없는 곳이라 proxy 와 308 리다이렉트를 쓸 수 없어서, 빌드 뒤
`scripts/export-fixup.ts` 가 그 둘을 파일로 대신 만든다 — 한국어 산출물을
루트로 올려 주소를 그대로 지키고, 옛 주소마다 문서를 한 장씩 굽는다.

`/sitemap.xml` 과 `/robots.txt` 는 빌드가 굽는다 — 글을 쓰면 따라오고 손으로
갱신할 곳은 없다. 구글 · 네이버에 사이트를 등록하는 절차도 같은 문서에 있다.

저장소 설정 · 하위 경로(`BASE_PATH`) · 검색엔진 등록 · 나중에 Cloudflare 로
옮기는 길은 **[docs/deploy.md](docs/deploy.md)** 에 있다.

## 규약

- frontmatter는 `title` `date` `summary` `tags` `draft` 다섯 개뿐이다.
  다른 키가 있으면 `pnpm index`가 거부한다 (zod `strictObject`)
- 이어 읽을 글은 frontmatter가 아니라 본문 `[[위키링크]]`에서 나온다.
  Obsidian에서 글을 잇는 행위가 그대로 /search 그래프의 선이 된다.
  한쪽에서만 걸어도 양쪽에 생기고, 가리키는 글이 없으면 경고만 남고 원문이 그대로 남는다
- 카테고리는 폴더로만 결정한다 (frontmatter에 `category` 없음).
  카테고리 아래로 더 판 폴더는 전부 하위 카테고리이고, 좌측 네비에 자동으로 선다.
  폴더 이름은 slug 와 같은 규칙이고 `page`만 못 쓴다 (쪽 넘김 경로와 겹친다)
- 카테고리 화면과 좌측 네비의 (n) 은 그 폴더에 **직접** 든 글만 센다.
  `dev/frontend/react` 의 글은 react 까지 들어가야 보인다 (폴더를 여는 것과 같다)
- slug는 영문 소문자 + 하이픈
- 발행 후 `post.id`(`category/…/slug`)를 바꾸지 않는다 — 폴더를 옮기는 것도 id를 바꾸는 일이다
- UI · 아이콘 · 애니메이션 라이브러리를 쓰지 않는다
  (예외 하나: 글 그래프의 좌표 계산에 쓰는 `d3-force`. 배치만 맡고 화면에서 돌지 않는다)
- R2 이미지를 `next/image`에 물리지 않는다 (`<Img>` 직접 서빙).
  사진 원본은 커밋하지 않는다 — `pnpm img` 가 R2 에 올리고 `config/images.json`
  에 주소만 남긴다. 안 올린 사진이 본문에 있으면 `pnpm index` 가 빌드를 멈춘다

파일명 규칙은 ESLint가 강제한다 — `src/components/**`는 PascalCase, `**/hooks/**`는 camelCase.

## 미결정

- 영어판 — `src/locales/en/common.json` 이 전부 빈 자리표시자라, 지금 영어를
  골라도 화면은 한국어다. 그래서 헤더의 언어 전환 버튼을 꺼 뒀다
  (`src/config/site.ts` 의 `SHOW_LANG_SWITCH`). 라우팅과 정적 생성은 그대로
  살아 있어서 `/en/…` 주소는 열리고, 문구를 채우면 한 줄로 되돌린다.
  같은 이유로 sitemap 은 한국어 주소만 싣고 robots.txt 가 `/en/` 을 막는다
- 한국어 검색 라이브러리 — 지금은 제목 · 요약 · 태그 부분일치뿐이다 (`src/lib/search.ts`)
- 분석 도구 (Plausible vs Umami vs Vercel Analytics) — 미설치.
  붙으면 /search 글 그래프의 카테고리별 글 선정 기준을 최신순에서 조회수순으로
  바꿀 수 있다. 선행 작업과 교체 지점은 `src/lib/posts.ts`의 `rankForGraph` 주석에 적어뒀다
- 도메인 · 사이트 명칭 — 이미지를 R2 로 서빙하려면 Cloudflare 에 올린 도메인이
  필요하다. 그때까지 사진은 `public/` 에 둔다 (docs/deploy.md)
- 디자인 토큰 (색 · 폰트 · 간격)
