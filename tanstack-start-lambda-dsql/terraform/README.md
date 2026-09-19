# CloudFront + S3 + Lambda + Aurora DSQL

東京リージョンに Lambda、DSQL、IAM、ログを作成し、CloudFront を公開入口にします。

- `/assets/*`: 非公開 S3。CloudFront OAC のみ読み取り可能。Vite のハッシュ付きファイルを長期キャッシュ。
- その他: Lambda Function URL。SSR・API をキャッシュせず、Cookie・クエリ・Authorization を転送。Host は Lambda のドメインに置換。
- Lambda は Function URL に直接アクセスすることも可能です。アプリ認証は未実装です。Lambda OAC は POST/PUT にリクエスト本文の SHA256 を要求するため、この構成では使用しません。
- DSQL 接続先・IAM 権限を Lambda に設定します。SQL クライアント・テーブル・マイグレーションは未実装です。接続時は IAM トークンを生成する必要があります。sandbox 用に対象クラスターの DbConnectAdmin を許可します。

## 初回

前提: Node.js 22.12 以上、pnpm、Terraform 1.7 以上、AWS CLI、zip、AWS 認証情報。
`tanstack-start-lambda-dsql` ディレクトリで実行します。

```sh
(cd app && pnpm install --frozen-lockfile && pnpm build:lambda && pnpm test:lambda)
terraform -chdir=terraform init
terraform -chdir=terraform plan
terraform -chdir=terraform apply
bash scripts/deploy.sh
```

最後に CloudFront URL を表示します。初回はデプロイスクリプトで S3 にファイルを配置するまでブラウザー用 JS を取得できません。
設定変更は `terraform.example.tfvars` を `terraform.tfvars` にコピーして行えます。

## アプリ更新

```sh
bash scripts/deploy.sh
```

Terraform はリソース構成を管理し、初回以降の Lambda コードは CLI が更新します。
`filename` と `source_code_hash` を ignore_changes に指定しており、Terraform apply で旧コードに戻しません。
S3 の既存ハッシュ付きファイルは削除しないため、更新前から開いているページの参照を保持します。
SSR はキャッシュせず、アセット URL は内容で変わるため、通常の更新で CloudFront invalidation は不要です。
`public/` に独自の favicon 等を追加する場合は、そのパスの S3 behavior とアップロード処理も追加してください。

## 検証

```sh
terraform -chdir=terraform fmt -check
terraform -chdir=terraform validate
terraform -chdir=terraform test
```

テストでは AWS provider をモックし、AWS リソースは作成しません。実際の ZIP 作成には `pnpm build:lambda` の成果物が必要です。
実 AWS への apply、CloudFront 経由の動作、DSQL 接続は別途実機検証が必要です。
state はローカルです。複数人で運用する際は共有 backend を設定してください。

## 削除

DSQL の `deletion_protection_enabled = false` を apply した後、アセットバケットを空にし、`terraform destroy` で削除します。

参考: [Lambda OAC の POST/PUT 制約](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-lambda.html)
