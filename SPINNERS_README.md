# Spinners de Chargement - Guide d'utilisation

## 🎯 Types de Spinners Disponibles

### 1. Spinner Circulaire (`.spinner-circular`)

- **Usage** : Chargements courts, centrés
- **HTML** : `<div class="spinner-circular" aria-label="Chargement en cours"></div>`

### 2. Spinner de Points (`.spinner-dots`)

- **Usage** : Listes dynamiques, sections
- **HTML** :

```html
<div class="spinner-dots">
  <div class="dot"></div>
  <div class="dot"></div>
  <div class="dot"></div>
</div>
```

### 3. Spinner de Barre (`.spinner-bar`)

- **Usage** : Chargements de fichiers, processus multi-étapes
- **HTML** : `<div class="spinner-bar"></div>`

## 🚀 Exemples d'Utilisation

### Lors de soumissions de formulaires :

```javascript
form.addEventListener("submit", function () {
  // Afficher spinner
  document.getElementById("spinner").style.display = "block";

  // Désactiver bouton
  submitBtn.disabled = true;
  submitBtn.textContent = "⏳ Traitement...";
});
```

### Lors de requêtes AJAX :

```javascript
// Afficher spinner
document.querySelector(".spinner-circular").style.display = "block";

// Après réponse
fetch("/api/data")
  .then((response) => response.json())
  .then((data) => {
    // Masquer spinner
    document.querySelector(".spinner-circular").style.display = "none";
    // Traiter les données
  });
```

## 🎨 Personnalisation

Les spinners utilisent la couleur principale `#1976d2` de l'application. Pour personnaliser :

- **Taille** : Modifier `width` et `height` dans le CSS
- **Couleur** : Changer `#1976d2` dans les propriétés CSS
- **Vitesse** : Ajuster la durée dans `animation` (ex: `1s` → `0.5s`)

## ♿ Accessibilité

Toujours ajouter `aria-label` pour les lecteurs d'écran :

```html
<div class="spinner-circular" aria-label="Chargement en cours"></div>
```
