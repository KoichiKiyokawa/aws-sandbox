@app
architect-typescript

@http
get /

@aws
# profile default
region ap-northeast-1
runtime typescript # sets TS as the the default runtime for your entire project

@plugins
architect/plugin-typescript
