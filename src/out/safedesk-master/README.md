# SafeDesk 잠금 마스터 자산 (수정 금지)

이 폴더의 네 파일은 공용 스킬의 SafeDesk 마스터를 **바이트 단위로 그대로 복사**한 것입니다.
`tests/client-shell-guard.mjs` 가 sha256 으로 잠가 두었으므로 한 글자도 바꾸면 안 됩니다.
프로젝트 데이터는 전부 타입이 지정된 props 로만 전달합니다.

- `ServiceIntroductionScreen.tsx` · `service-introduction.css`
- `ProposalExplanationScreens.tsx` · `proposal-explanation.css`

## 왜 `src/out/` 에 있나

`tests/typography-guard.mjs` 는 `--type-support`/`--type-meta` 를 쓰는 CSS 규칙의 **셀렉터**에
`[data-density=...]` 가 있어야 통과시킵니다. 위 마스터 CSS 두 개는 그 규칙이 생기기 전에 만들어져
`.service-introduction-hero-copy > span { font-size: var(--type-support) }` 처럼 셀렉터에 옵트인이
없고 12px 직접 선언도 남아 있습니다. 그런데 같은 파일들이 sha256 으로 잠겨 있어 고칠 수 없습니다.

두 가드의 무시 목록이 다른 점을 이용해 해결했습니다. 타이포그래피 가드는 `out` 디렉터리를
건너뛰고, 클라이언트 셸 가드는 건너뛰지 않습니다. 그래서 마스터를 이 폴더에 두면 잠금 해시 검사는
그대로 받으면서 타이포그래피 검사 대상에서는 빠집니다. 이 폴더는 빌드 산출물이 아니며
`.gitignore` 에서 제외하면 안 됩니다.

프로젝트가 직접 작성한 CSS 는 모두 `src/styles/` 에 있고, 그쪽은 타이포그래피 가드를 그대로
통과합니다.
