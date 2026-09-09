# cache

미니멀 · 리퀴드글라스 디자인의 웹 클라우드 스토리지.
데스크탑, iPhone Safari, 홈 화면 PWA에 최적화되어 있다.

| 역할 | 서비스 |
| --- | --- |
| 호스팅 (정적 사이트) | **Vercel** |
| 로그인 · 메타데이터 DB · Edge Function | **Supabase** |
| 파일 바이트 저장 | **Cloudflare R2** |

브라우저는 R2 시크릿을 갖지 않는다. Supabase Edge Function `r2-presign` 이 로그인 사용자 확인 후
그 사용자 소유 키(`<user_id>/…`)에 대해서만 presigned URL 을 발급하고, 브라우저는 그 URL 로 R2 에 직접 업로드/다운로드한다.

## 구조

```
index.html                  PWA 메타 · 첫 페인트 전 테마 결정
src/
  App.jsx                   로그인 게이트 · 탭 셸 · 업로드 큐
  components/TabBar.jsx     하단 리퀴드글라스 탭바 (홈 / 파일 / 설정, 글씨만)
  components/PageHeader.jsx 좌측정렬 제목, 스크롤에 따라 투명도·블러만 조절
  components/ItemSheet.jsx  파일/폴더 동작 시트 (미리보기 · 열기 · 다운로드 · 이름 변경 · 삭제)
  pages/                    HomePage · FilesPage · SettingsPage · AuthPage
  lib/items.js              Supabase items 테이블 + R2 를 함께 다루는 데이터 계층
  lib/r2.js                 r2-presign 호출 · 진행률 있는 PUT
  lib/theme.js              시스템/라이트/다크 (다크 배경 #1B1B1B)
  styles.css                디자인 토큰 · 글라스 표면 · 애니메이션
supabase/
  schema.sql                items / profiles 테이블, RLS, 사용량 RPC
  functions/r2-presign/     R2 presign Edge Function
public/                     manifest · 서비스워커 · 아이콘
vercel.json                 SPA rewrite · 캐시 헤더
```

## 설정

### 1. Supabase

1. 프로젝트 생성 후 **SQL Editor** 에서 `supabase/schema.sql` 실행.
2. **Authentication › Providers › Email** 활성화. (가입을 막고 대시보드에서 계정을 직접 만들려면 *Allow new users to sign up* 을 끈다.)
3. Edge Function 배포와 시크릿 등록:

   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase secrets set R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET_NAME=cache
   supabase functions deploy r2-presign
   ```

### 2. Cloudflare R2

1. 버킷 생성 (예: `cache`).
2. **R2 API 토큰** 을 *Object Read & Write* 권한으로 발급해 위 시크릿에 넣는다.
3. 브라우저가 presigned URL 로 직접 요청하므로 버킷 **CORS 정책** 이 필요하다 (버킷 › Settings › CORS Policy):

   ```json
   [
     {
       "AllowedOrigins": ["https://<your-app>.vercel.app", "http://localhost:5173"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["content-type"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

### 3. Vercel

1. 이 저장소를 Vercel 에 import (Framework: Vite, 기본 빌드 설정 그대로).
2. **Environment Variables** 에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 등록.
3. 배포 후 Supabase **Authentication › URL Configuration** 의 Site URL / Redirect URL 에 Vercel 도메인을 추가.

## 로컬 실행

```bash
cp .env.example .env   # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 채우기
npm install
npm run dev
```

## 디자인 메모

- 배경은 `html`/`body` 모두에 칠하고 `viewport-fit=cover` + `black-translucent` 상태바로 iPhone 상단까지 한 색으로 감싼다. `theme-color` 는 테마 전환 시 갱신.
- 하단 탭바는 고정된 알약 형태의 유리 표면 위에서, 선택된 탭 뒤의 인디케이터가 스프링 곡선으로 미끄러지며 이동 중 살짝 늘어난다.
- 상단 제목은 `position: sticky` 로 따라오며 배경색 없이 스크롤 진행도에 따라 배경 투명도와 블러만 올라간다.
