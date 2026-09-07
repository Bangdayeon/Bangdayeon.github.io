# 배포

GitHub Pages 에 정적 파일로 올린다. `main` 에 push 하면
`.github/workflows/deploy.yml` 이 빌드해서 굽는다. 손으로 할 일은 없다.

서버가 없는 곳이라, 평소에 이 사이트를 서 있게 하는 두 가지를 파일로 대신
만들어야 한다. Next 문서의 정적 내보내기 미지원 목록에 **Proxy 와 Redirects 가
둘 다** 있기 때문이다. 그 대신 굽는 것이 `scripts/export-fixup.ts` 다.

---

## 1. 처음 한 번 (저장소 설정)

**Settings → Pages → Source 를 `GitHub Actions` 로.** 기본값인
"Deploy from a branch" 로 두면 워크플로가 만든 산출물이 무시된다.

그리고 **저장소 이름을 `<계정>.github.io` 로 두는 쪽을 권한다.** 그래야 사이트가
`https://<계정>.github.io/` 루트에 서고, 글 주소가 `/dev/mdx-pipeline` 이 된다 —
나중에 도메인을 붙일 때 주소가 한 글자도 안 바뀐다. 발행 후 id 를 고정한다는
규약(README)이 배포처를 옮겨도 지켜지는 자리다.

저장소 이름을 그대로 두면 사이트가 `https://<계정>.github.io/room/` 하위 경로에
선다. 그때는 **Settings → Secrets and variables → Actions → Variables** 에
`NEXT_PUBLIC_BASE_PATH = /room` 을 넣는다. 대신 나중에 도메인으로 옮길 때 `/room` 이
떨어지면서 주소가 한 번 바뀐다.

| 저장소 이름        | 주소                          | `NEXT_PUBLIC_BASE_PATH` |
| ------------------ | ----------------------------- | ----------------------- |
| `<계정>.github.io` | `<계정>.github.io/dev/x`      | 비워 둔다               |
| `room`             | `<계정>.github.io/room/dev/x` | `/room`                 |

하위 경로에 세우면 **본문 폰트 하나가 안 따라온다.** `@font-face` 의 파일 경로는
CSS 에 문자열로 적혀 있는데 CSS 는 basePath 를 모르기 때문이다 (상대 경로로
적는 길은 Turbopack 이 그걸 모듈로 해석하려 들어서 막혀 있다). 글꼴이 시스템
폴백으로 렌더될 뿐 나머지는 멀쩡하지만, 저장소 이름을 바꾸는 쪽을 권하는 이유가
하나 더 있는 셈이다.

같은 Variables 화면에 `NEXT_PUBLIC_SITE_URL` 과, 이미지를 R2 로 옮긴 뒤에는
`NEXT_PUBLIC_IMAGE_BASE_URL` 도 넣는다.

### 조회수 (선택)

[GoatCounter](https://www.goatcounter.com) 에 사이트를 만들면 `<코드>.goatcounter.com`
을 받는다. 그 코드와 API 토큰(GoatCounter → Settings → API)을 저장소에 넣으면 집계가
붙는다.

| 값                             | 자리      | 쓰이는 곳                            |
| ------------------------------ | --------- | ------------------------------------ |
| `NEXT_PUBLIC_GOATCOUNTER_CODE` | Variables | 집계 스크립트 (화면에 나가는 값이다) |
| `GOATCOUNTER_API_TOKEN`        | Secrets   | 사이드바 숫자 (빌드에서만 쓴다)      |

둘 다 없어도 배포는 된다 — 스크립트가 아예 안 실려 나가고 사이드바는 "조회수 집계
전"으로 선다. 로컬에서 시험하려면 `.env.local` 에 같은 두 줄을 넣는다 (코드를 넣지
않으면 로컬 새로고침이 숫자에 안 섞인다).

숫자는 `pnpm build` 가 한 번 받아 굽는다(`scripts/fetch-views.ts` → `src/data/views.json`).
정적 사이트라 화면이 그릴 때 API 를 부를 수 없어서고, 그래서 **배포 시점에 멈춘다** —
더 자주 갱신하려면 워크플로에 cron 을 건다. 받아오기가 실패해도 빌드는 통과한다.

---

## 2. 빌드가 하는 일

```
pnpm build
  ├─ pnpm index                    글 검증 + 색인. 어긋나면 여기서 멈춘다
  └─ scripts/build-static.ts
       ├─ NEXT_EXPORT=1 next build  정적 내보내기 → out/
       └─ scripts/export-fixup.ts   out/ 을 서버 없는 곳에 맞게 고친다
```

`NEXT_EXPORT` 를 빌드에서만 켜는 이유가 있다. `output: 'export'` 를 항상 켜 두면
**`next dev` 가 죽는다** — 내보내기 모드에서는 proxy 가 아예 안 돌고, 주소에서
언어를 감추는 일을 그 proxy 가 하고 있어서 `/dev/x` 가 500, `/` 가 404 가 된다.
글 쓰는 자리는 서버가 있는 채로 둔다.

### export-fixup 이 고치는 네 가지

**한국어를 루트로 올린다.** 내보내기는 `/ko/…` 와 `/en/…` 만 만든다. 한국어
산출물을 통째로 루트로 옮겨 `/dev/x` 를 되살린다. 옮기기만 하면 되는 건
`hideDefaultLocale` 덕이다 — 한국어 HTML 안의 링크가 이미 접두사 없이 적혀 있다.

**세그먼트 프리페치를 펼친다.** Next 16 은 링크를 미리 받을 때 화면 조각만
받는데, 그 주소는 점으로 이어져 있고(`__next.$d$lng.….txt`) 내보내기는 폴더로
판다. 정적 호스트는 그 사이를 못 이어서 프리페치가 전부 404 가 된다. 언어를
옮긴 것과 무관한 문제다 — 손대지 않은 `/en` 쪽에서도 똑같이 난다.

**한글 주소를 두 벌로 둔다.** `/tags/회고` 를 Next 는 `%ED%9A%8C%EA%B3%A0.html`
이라는 이름으로 쓴다. 브라우저는 인코딩된 형태로 요청하지만 그걸 파일로 바꾸는
방식은 서버마다 달라서, 디코딩된 이름으로도 한 벌 복사해 둔다.

**옛 주소에 문서를 굽는다.** 308 을 보낼 서버가 없으니 `id-redirects.json` 의
줄마다 meta refresh 문서를 만든다. 표는 어느 쪽에서나 같은 정본이라, 서버 있는
곳으로 옮기면 `next.config` 의 `redirects` 가 그대로 다시 308 을 만든다.

여기에 `.nojekyll` 을 하나 더 둔다. 없으면 Jekyll 이 `_next/` 를 통째로 걷어내서
스타일도 스크립트도 안 나온다.

---

## 3. 검색엔진에 올리기

`github.io` 주소도 그대로 등록된다 — 구글도 네이버도 도메인을 샀는지 따지지 않는다.
다만 등록은 주소 단위라, 나중에 도메인을 붙이면 한 번 더 해야 한다. 저장소 이름을
`<계정>.github.io` 로 두어 주소가 안 바뀌게 하는 편이 여기서도 낫다.

빌드가 이미 두 파일을 굽는다. 손으로 갱신할 것은 없다.

| 파일           | 만드는 곳            | 하는 일                                                   |
| -------------- | -------------------- | --------------------------------------------------------- |
| `/sitemap.xml` | `src/app/sitemap.ts` | 홈 · 카테고리 · 태그 · 글의 주소 목록. 글을 쓰면 따라온다 |
| `/robots.txt`  | `src/app/robots.ts`  | 크롤러 규칙과 sitemap 위치                                |

둘 다 `NEXT_PUBLIC_SITE_URL` 로 절대 주소를 만든다. 상대 경로로는 적을 수 없는
값이라, **저장소 Variables 에 넣는 것이 여기서부터 선택이 아니다** —
`https://<계정>.github.io`, 끝에 슬래시 없이. 비워 두면 코드에 박아 둔 기본값으로
떨어진다 (`src/config/site.ts`).

sitemap 에는 **한국어 주소만** 싣고 robots.txt 는 `/en/` 을 막는다. 지금 영어
번역이 전부 빈 자리표시자라 `/en/…` 이 같은 한국어 본문을 다른 주소로 한 번 더
내놓는 중이고, 그대로 두면 검색엔진이 어느 쪽을 정본으로 볼지 스스로 고른다.
번역을 채우면 두 곳을 같이 푼다 (`src/config/site.ts` 의 `SHOW_LANG_SWITCH`).

### 소유 확인 — 파일 한 장

두 곳 모두 사이트가 내 것임을 확인시켜야 한다. GitHub Pages 에는 DNS 를 만질
자리가 없으므로 **HTML 파일 방식**을 쓴다. 받은 파일을 `public/` 에 그대로 두고
push 하면 사이트 루트에 그 이름으로 선다 — `public/` 은 Next 가 손대지 않고
`out/` 루트로 복사한다.

```
public/google1234abcd.html              → https://<계정>.github.io/google1234abcd.html
public/naver-site-verification-….html   → https://<계정>.github.io/naver-site-verification-….html
```

확인이 끝나도 파일은 지우지 않는다. 두 서비스 모두 주기적으로 다시 확인하고,
파일이 사라지면 소유 확인이 풀린다.

### 구글 — Search Console

1. <https://search.google.com/search-console> → 속성 추가 → **URL 접두어**
   (도메인 방식은 DNS 레코드를 요구해서 여기서는 못 쓴다)
2. `https://<계정>.github.io/` 를 넣고 확인 방법에서 **HTML 파일**을 받는다
3. `public/` 에 두고 push → 배포가 끝난 뒤 "확인"
4. 왼쪽 **Sitemaps** 에 `sitemap.xml` 을 제출한다

### 네이버 — 서치어드바이저

1. <https://searchadvisor.naver.com> → 웹마스터 도구 → 사이트 등록
2. 소유확인에서 **HTML 파일**을 받아 같은 방식으로 `public/` 에 둔다
3. **요청 → 사이트맵 제출** 에 `sitemap.xml`
4. **검증 → robots.txt** 로 규칙이 제대로 읽히는지 본다

빙(Bing)은 Search Console 계정을 그대로 가져오는 길이 있어서, 구글을 먼저 끝내면
[Bing Webmaster Tools](https://www.bing.com/webmasters) 에서 가져오기 한 번이면 된다.

### 얼마나 걸리나

등록했다고 바로 색인되지 않는다. 새 사이트는 며칠에서 몇 주가 보통이고,
**글이 없으면 색인할 것도 없다** — 등록만 해 두고 글을 쌓는 순서가 맞다.

---

## 4. 지금 감수하는 것

|         | 지금              | 서버 있는 곳으로 옮기면 |
| ------- | ----------------- | ----------------------- |
| 옛 주소 | meta refresh      | 308                     |
| 이미지  | `public/` 에 커밋 | R2 (`pnpm img`)         |

둘 다 되돌아온다. 코드에서 지운 것이 없기 때문이다 — `src/proxy.ts` 도,
`next.config` 의 `redirects` 도, `pnpm img` 도 그대로 있고 지금은 꺼져 있을 뿐이다.

---

## 5. 나중에 Cloudflare 로 옮길 때

도메인을 사서 Cloudflare 에 올리면 두 갈래가 열린다.

**이미지만 옮기는 경우** — 사이트는 GitHub Pages 에 그대로 두고, R2 에 커스텀
도메인을 붙여 `NEXT_PUBLIC_IMAGE_BASE_URL` 을 채운다. `pnpm img` 를 한 번 돌리고
`public/` 의 사진을 지우면 끝이다. **코드는 안 고친다** — `<Img>` 가 표를 먼저
보고 없을 때만 `public/` 을 보기 때문에, 표가 채워지는 순간 알아서 넘어간다.
저장소에 쌓인 사진은 `git filter-repo` 로 이력에서 걷어낼 수 있다.

**사이트까지 옮기는 경우** — `@opennextjs/cloudflare` 로 Workers 에 올린다
(Next 16 을 지원한다). 되돌리는 자리는 넷뿐이다.

- `pnpm build` 대신 `pnpm build:server`
- `scripts/export-fixup.ts` 삭제
- `src/proxy.ts` 는 그대로 두면 다시 돈다 (내보내기 때만 꺼진다)
- `next.config` 의 `redirects` 도 그대로 다시 308 이 된다

`r2.dev` 는 쓰지 않는다. Cloudflare 문서가 개발용이라고 못박아 뒀고, 캐시가 없어
사진을 볼 때마다 R2 를 직접 때린다. 커스텀 도메인을 붙여야 CDN 캐시가 앞에 선다.

---

## 6. 로컬에서 배포본 그대로 보기

```bash
pnpm build
npx serve out    # 또는 아무 정적 서버
```

확장자 없는 주소를 `.html` 로 떨어뜨리는 서버여야 GitHub Pages 와 같게 보인다.
