# TanStack Start + AWS Lambda + Aurora DSQL

Lambda・Aurora DSQL・Terraform を検証するプロジェクトです。

## 構成

- `app/`: 動作確認済みの TanStack Start アプリ。SSR、動的 URL、API をコードで定義します。
- `terraform/`: CloudFront・非公開 S3・Lambda・Aurora DSQL・IAM の定義。

CloudFront は `/assets/*` を S3、それ以外を Lambda に転送します。基盤は Terraform、アプリ更新は `bash scripts/deploy.sh` で行います。[構築・更新手順](terraform/README.md)を参照してください。DSQL はリソースと接続設定までで、SQL 処理は未実装です。

## 実行

```sh
cd app
pnpm install --frozen-lockfile
pnpm dev
```

`/`、`/hello/Ada`、`/api/ping` を確認できます。本番ビルドは `pnpm build` です。

## コード定義ルーティング

`app/src/router.tsx` の `getRouter()` は `createRoute()` で組んだ独自ツリーを返します。Start の生成処理に必要な `app/src/routes/__root.tsx` はダミーとして残します。生成される `routeTree.gen.ts` はアプリからインポートしません。API のサーバー専用処理は `createServerOnlyFn()` に配置しています。

確認済みのバージョン: TanStack Start 1.168.56、Router 1.170.38、Vite 8.3.0。型チェック、本番ビルド、SSR・API の HTTP 応答を検証済みです。
