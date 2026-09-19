# TanStack Start + Drizzle TODO

PR #93のコード定義ルーティングを維持したTODOアプリです。

- TODOの追加・編集・完了／未完了・削除、状態の絞り込み、検索
- Tailwind CSS v4 + shadcn/ui。日本語UI、スマートフォン対応
- Drizzle ORM。ローカルはファイル保存のPGlite、接続先の指定でPostgreSQL／Aurora DSQL
- Oxlint + `@shadcn/lint`、Oxfmt、Vitest、Playwright

## 起動

Node.js 22.18以降、pnpm 11.19.0を使用します。

```sh
cd tanstack-start-lambda-dsql/app
pnpm install --frozen-lockfile
pnpm db:setup
pnpm dev
```

http://localhost:3000/ を開きます。DockerやAWS認証は不要です。データは`app/.data/todos/`に保存され、再起動しても残ります。初期データは空です。同じPGliteディレクトリを複数プロセスで同時に開かないでください。

## DB接続

`app/.env.example`を`.env`にコピーし、必要な値を設定します。

| 環境変数 | 用途 |
| --- | --- |
| `PGLITE_DATA_DIR` | ローカルDB保存先。既定値`./.data/todos` |
| `DATABASE_URL` | 通常のPostgreSQL接続URL |
| `DSQL_HOST` | Aurora DSQLエンドポイント。指定時は最優先 |
| `DSQL_USER` | DSQLのDBユーザー。既定値`admin` |
| `AWS_REGION` | DSQLリージョン。既定値`ap-northeast-1` |

Terraformが設定する`PGHOST`・`PGUSER`・`DSQL_REGION`にも対応しています。

DSQLはAWS SDKの認証チェーンを使い、新規DB接続時にIAM認証トークンを発行します。`admin`には`dsql:DbConnectAdmin`、一般DBユーザーには`dsql:DbConnect`とDB側のユーザーマッピング・権限が必要です。TLS証明書を検証します。Lambda上でDB接続先が未設定の場合はエラーとし、ローカルファイルへの保存には切り替えません。

`pnpm db:setup`は指定したDBへ初期テーブルを作成します。DSQL用にDDLを単独実行し、トランザクションで囲みません。既存テーブルがある場合は何もしません。**スキーマ変更を適用する汎用マイグレーターではありません。** スキーマ変更時は`pnpm db:generate`でSQLを生成し、対象DBの制約を確認して適用してください。UUIDはアプリ側で生成し、連番・外部キー・二次インデックスを使用していません。

DSQLへの実接続・AWSデプロイは未検証です。CloudFront・S3・Lambda・DSQLのTerraform定義とデプロイスクリプトはmainから取り込んでいます。`pnpm build`はNodeサーバー向け、`pnpm build:lambda`はLambda向けです。[構築・更新手順](terraform/README.md)を参照してください。CloudFrontは`/assets/*`をS3、それ以外をLambdaへ転送します。デプロイ先のDBにも初回は`pnpm db:setup`でテーブルを作成してください。

このアプリは認証なしの共有TODOです。同じDBに接続する利用者は同じタスクを操作します。

## 検証コマンド

```sh
pnpm check
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

`check`でLint・フォーマット・型チェック・DBテストを実行します。E2Eは実行ごとの一時DBと専用ポート3100を使い、追加→再読込→編集→完了→検索→未完了→削除を検証します。

本番の起動は`node --env-file-if-exists=.env .output/server/index.mjs`です。PGliteを使用する場合は`app/`をカレントディレクトリにして実行してください。

## Lintとデザイン規則

`.oxlintrc.json`でOxlintのJSプラグインとして`@shadcn/lint`を登録しています。コンポーネント利用側で以下を検査します。

- `no-restyle`: ボタンなどの見た目の変更は`variant`／`size`で指定する
- `no-raw-colors`: 色は`primary`などのテーマトークンを使う
- `no-arbitrary-values`: 任意の数値によるスタイル指定を避ける
- `no-inline-styles`: インラインスタイルを避ける
- `require-static-classes`: Tailwindクラスを静的に解析できる形で記述する

`src/components/ui/`自体では見た目を定義するため、前の3ルールを除外しています。アプリ側のルールは無効化していません。`pnpm lint:fix`と`pnpm format`で自動修正できます。

## コード定義ルーティング

`app/src/router.tsx`の`getRouter()`は`createRoute()`で構成した独自ツリーを返します。Startの生成処理に必要な`src/routes/__root.tsx`はダミーとして残し、生成される`routeTree.gen.ts`は使用しません。DB操作は`createServerFn()`経由でサーバーだけで実行します。既存の`/hello/$name`と`/api/ping`も維持しています。
