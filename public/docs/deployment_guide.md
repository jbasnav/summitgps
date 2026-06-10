# Guía de Despliegue de SummitGPS

Esta guía detalla los pasos para subir tu proyecto SummitGPS a producción en diferentes tipos de plataformas. Dado que **SummitGPS** es una aplicación cliente (Single Page Application - SPA) construida con **React, TypeScript y Vite**, su despliegue consiste en compilar el proyecto a archivos estáticos (HTML, JS, CSS) y servirlos.

---

## 🚀 Opción 1: Hosting Estático Moderno (Recomendado)
Servicios como **Vercel**, **Netlify** o **Cloudflare Pages** son las mejores opciones para este tipo de aplicaciones. Son gratuitos para proyectos personales, extremadamente rápidos y ofrecen despliegues automáticos cada vez que subes cambios a tu repositorio de GitHub.

### 📋 Requisitos Previos
1. Tener el código del proyecto en un repositorio de **GitHub**, **GitLab** o **Bitbucket**.
2. Crear una cuenta gratuita en la plataforma elegida (p. ej., [Vercel](https://vercel.com) o [Netlify](https://netlify.com)).

### 🛠️ Pasos para Vercel (Recomendado por su simplicidad)
1. **Conectar tu cuenta**: Inicia sesión en Vercel y conecta tu cuenta de GitHub.
2. **Importar el proyecto**: Haz clic en **"Add New"** > **"Project"** y selecciona el repositorio `SummitGPS`.
3. **Configuración del Proyecto**:
   - **Framework Preset**: Selecciona o verifica que reconozca **Vite**.
   - **Build Command**: `npm run build` o `vite build` (se detecta automáticamente).
   - **Output Directory**: `dist` (se detecta automáticamente).
4. **Variables de Entorno (Environment Variables)**:
   Debes agregar las variables que tienes en tu archivo `.env.local` para que la aplicación pueda comunicarse con Supabase y GraphHopper:
   
   | Nombre de la Variable | Valor (de tu `.env.local`) |
   | :--- | :--- |
   | `VITE_SUPABASE_URL` | `https://kzeujtxzwijjfckglmwq.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1...` *(tu clave anon)* |
   | `VITE_GRAPHHOPPER_KEY` | `2761a7f1-b1c8-4e5d-a56e-a2697d57b7e2` |
   
5. **Desplegar**: Haz clic en el botón **"Deploy"**. En unos segundos tendrás tu aplicación publicada con una URL pública gratuita (p. ej. `summitgps.vercel.app`).

> [!TIP]
> **Redirección de Rutas (SPA Routing Fallback):**
> Vercel y Netlify manejan las rutas del lado del cliente automáticamente. Si experimentas problemas al recargar la página en una ruta específica (p. ej. `miweb.com/ruta` da error 404), debes agregar un archivo de configuración en la raíz del código:
> - **Para Vercel:** Crea un archivo `vercel.json` en la raíz del proyecto con:
>   ```json
>   {
>     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
>   }
>   ```
> - **Para Netlify:** Crea un archivo `_redirects` en la carpeta `public` con:
>   ```text
>   /*    /index.html   200
>   ```

---

## 🖥️ Opción 2: Servidor Propio / VPS (DigitalOcean, AWS, Google Cloud, Linode)
Si prefieres administrar tu propio servidor usando Linux, la mejor opción es configurar **Nginx** para servir los archivos estáticos de forma eficiente.

### 📋 Requisitos Previos
- Un servidor VPS con Linux (Ubuntu recomendado).
- Acceso SSH al servidor.
- Node.js instalado localmente para compilar, o Git en el servidor para compilar allí.

### 🛠️ Pasos para el Despliegue
1. **Compilar el proyecto localmente**:
   Ejecuta en tu terminal local:
   ```bash
   npm run build
   ```
   Esto generará una carpeta llamada `dist/` en la raíz de tu proyecto. Esta carpeta contiene todo el sitio web compilado y optimizado.

2. **Subir los archivos al servidor**:
   Sube la carpeta `dist` a tu servidor usando `scp` o `rsync`. Por ejemplo:
   ```bash
   rsync -avzP dist/ usuario@ip_de_tu_servidor:/var/www/summitgps
   ```

3. **Configurar Nginx**:
   Accede a tu servidor por SSH y crea un archivo de configuración para tu sitio en Nginx:
   ```bash
   sudo nano /etc/nginx/sites-available/summitgps
   ```
   Añade la siguiente configuración (reemplazando `tu_dominio.com` y la ruta de los archivos):
   ```nginx
   server {
       listen 80;
       server_name tu_dominio.com www.tu_dominio.com;

       root /var/www/summitgps;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # Opcional: Cachear archivos estáticos para mejorar la velocidad
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|otf)$ {
           expires 1y;
           add_header Cache-Control "public, no-transform";
       }
   }
   ```
   > [!IMPORTANT]
   > La directiva `try_files $uri $uri/ /index.html;` es **esencial** para aplicaciones React. Asegura que cualquier ruta ingresada directamente por el navegador sea redirigida a `index.html` para que React Router pueda manejarla.

4. **Habilitar el sitio y reiniciar Nginx**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/summitgps /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. **Configurar SSL (HTTPS) con Let's Encrypt**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d tu_dominio.com -d www.tu_dominio.com
   ```

---

## 📁 Opción 3: Hosting Tradicional Compartido (cPanel / FTP)
Si tienes un hosting contratado (Hostinger, GoDaddy, Webempresa, etc.) que utiliza **cPanel** y no tienes acceso a la terminal por SSH, puedes subir la aplicación de manera manual.

### 🛠️ Pasos para el Despliegue
1. **Compilar el proyecto**:
   Ejecuta localmente:
   ```bash
   npm run build
   ```
2. **Subir los archivos**:
   - Entra al panel de control de tu hosting (cPanel).
   - Abre el **Administrador de Archivos** (File Manager) o usa un cliente FTP como **FileZilla**.
   - Ve a la carpeta `public_html` (o la carpeta correspondiente a tu subdominio).
   - Sube **todo el contenido** que está dentro de la carpeta `dist/` local (no subas la carpeta `dist` en sí, sino lo que hay dentro: `assets/`, `index.html`, etc.).

3. **Configurar el enrutamiento (Routing Fallback)**:
   Dado que los servidores de hosting tradicional usan **Apache**, si recargas una página interna (como `tudominio.com/settings`) te dará un error **404 Not Found**. Para solucionar esto:
   - Crea un archivo llamado `.htaccess` en la raíz de tu carpeta `public_html` (donde subiste el `index.html`).
   - Añade las siguientes líneas de código:
     ```apache
     <IfModule mod_rewrite.c>
       RewriteEngine On
       RewriteBase /
       RewriteRule ^index\.html$ - [L]
       RewriteCond %{REQUEST_FILENAME} !-f
       RewriteCond %{REQUEST_FILENAME} !-d
       RewriteRule . /index.html [L]
     </IfModule>
     ```
   - Guarda los cambios. Esto le dice a Apache que redirija todas las peticiones que no sean archivos físicos (imágenes, scripts) al `index.html`.
