# asteroids-bubblegum — Befunde und der Weg zum Deploy

Gemessen am 20.09.2026 von der direct-servicebay Session, die SSH-Zugriff auf die
Box hat. Alles hier ist nachgemessen, nicht vermutet.

## Zwei Fehler im aktuellen Stand

**1. Das Dockerfile startet nicht.** Ich habe es gebaut und laufen lassen:

    Status: Exited (1)
    nginx: [emerg] "location" directive is not allowed here
           in /etc/nginx/conf.d/health.conf:1

Die Zeile `RUN echo 'location /health {...}' > /etc/nginx/conf.d/health.conf`
schreibt eine `location`-Direktive in den `http`-Kontext. Dort ist sie verboten —
sie muss in einen `server`-Block. Schreib stattdessen eine vollstaendige
`default.conf` mit `server { listen 80; root /usr/share/nginx/html;
location /health { ... } }`.

**2. Der Port passt nicht.** `nginx:stable-alpine` hoert auf **80**. Das Template
setzt `servicebay.ports: 8080` und den Healthcheck auf 8080. Eines von beiden
muss sich bewegen.

Beide Fehler waren von hier aus nicht zu sehen: der Container hat kein podman,
also konntest du das Image nicht bauen und nicht pruefen. Das ist keine Schuld,
sondern eine Luecke — siehe unten. Konsequenz fuer den Bericht: hak nichts als
fertig ab, was du nicht laufen lassen konntest. Schreib "ungeprueft, kein
Build-Werkzeug" hin.

## Der Weg zum Deploy — das Muster, das die Box tatsaechlich benutzt

Nicht ein separates Template-Repo. Alle drei funktionierenden Registries sind die
**Dienst-Repos selbst**, jedes mit einem `templates/`-Verzeichnis neben dem Code:

    foundry-chronicle   Dockerfile  pyproject.toml  templates/daggerheart-chronik
    solbay              ruff.toml                   templates/{llama,pi-web,solaris}
    servicebay          Dockerfile  package.json    templates/{adguard,immich,...}

`foundry-chronicle` ist dein Fall: eine App, ein Repo, ein Dockerfile, ein
Template darin. Also:

1. `mdopp/asteroids-bubblegum` anlegen.
2. Hinein: Code, korrigiertes Dockerfile, CI-Workflow der nach
   `ghcr.io/mdopp/asteroids-bubblegum:latest` baut (Package oeffentlich, sonst
   kann die Box es nicht pullen), und `templates/asteroids-bubblegum/` mit
   `template.yml` + `variables.json`.
3. Der Operator traegt das Repo **einmal** als Registry ein. Das ist seine
   Entscheidung, nicht deine — frag danach, nimm sie nicht vorweg.
4. Dann `servicebay request-install asteroids-bubblegum --as asteroids ...`.
   Diesmal findet die Box ein Template. Der letzte Versuch scheiterte an
   "asteroids-bubblegum carries no template spec in this manifest".

## Du kannst jetzt pushen — und Repos anlegen

Seit dem 20.09. hat dieser Pod ein Git-Credential. Nachgemessen:
`git ls-remote` gegen ein privates Repo gibt Exit 0.

Es gibt hier **kein `gh` und kein `curl`**, und das Token steht bewusst nicht in
deiner Umgebung. Es liegt in `/data/pi-web/git-credentials` (mode 600, Eigentuemer
`node` — der Nutzer, unter dem du laeufst). Fuer `git` brauchst du gar nichts zu
tun, der credential.helper zieht es selbst. Fuer die GitHub-API nimmst du `node`:

    const line = require("fs").readFileSync("/data/pi-web/git-credentials","utf8").trim().split("\n")[0];
    const tok  = new URL(line).password;
    await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: { Authorization: "token " + tok, "User-Agent": "pi", "Content-Type": "application/json" },
      body: JSON.stringify({ name: "asteroids-bubblegum", private: false })
    });

Das Token traegt `repo`, `workflow`, `write:packages` auf Konto `mdopp`.
Also: Repo anlegen ja, Workflows pushen ja, nach ghcr schieben ja.

Schreib das Token nie in eine Remote-URL, in argv oder auf stdout. `/proc/<pid>/cmdline`
ist fuer alle lesbar, und auf diesem Container gibt es echte Logins.

## Was du weiterhin nicht kannst

Ein Image bauen. Kein podman, kein docker, kein buildah, kein Socket — bewusst so
(ADR 0007). Deshalb baut die CI im Repo, nicht du. Rechne damit, dass du einen
Container-Fehler erst siehst, wenn die CI rot wird.
