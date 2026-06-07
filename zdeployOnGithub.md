```shell
ng new demo
cd demo

# create repo, then in your project, connect them
git init
git add .
git commit -m 'first message'
git remote add origin https://github.com/{username}/{reponame}.git
git push -u origin main
# now, in github, the code should be exist

# add angular github pages
ng add angular-cli-ghpages
ng deploy --base-href=/angular_demo_app/

# congrats
```