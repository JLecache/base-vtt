# Base VTT 🚵‍♂️

> **Application web interactive pour explorer, visualiser et partager les parcours VTT d'une base VTT, avec carte dynamique, profils d'élévation et filtres avancés.

---

## Présentation

Base VTT est une application web moderne permettant de découvrir, visualiser et analyser les parcours VTT d'une région. Grâce à une interface responsive et intuitive, elle s'adresse aussi bien aux vététistes débutants qu'aux passionnés souhaitant explorer de nouveaux circuits.

L'application propose :
- Une carte interactive (Leaflet) avec plusieurs fonds cartographiques
- Le chargement dynamique des traces GPX
- Un affichage du profil d'élévation (Chart.js)
- Des statistiques détaillées (distance, dénivelé, altitude max, etc.)
- Un système de filtres par difficulté et recherche par nom
- Un mode mobile optimisé avec "bottom sheet"
- Le téléchargement et le partage des traces GPX
- La géolocalisation de l'utilisateur

## Démo

![Aperçu de l'application](img/screenshot.png)

## Fonctionnalités principales

- **Carte interactive** : Navigation fluide, zoom, plusieurs fonds (OSM, satellite, topo...)
- **Liste des parcours** : Filtres par difficulté (vert, bleu, rouge, noir), recherche instantanée
- **Chargement GPX** : Affichage du tracé, profil d'élévation, stats automatiques
- **Responsive** : Expérience optimisée desktop et mobile (panneau latéral / bottom sheet)
- **Téléchargement & partage** : Export direct du GPX, lien de partage rapide
- **Géolocalisation** : Affichage de la position en temps réel sur la carte

## Technologies utilisées

- [Leaflet](https://leafletjs.com/) : Carte interactive
- [leaflet-gpx](https://github.com/mpetazzoni/leaflet-gpx) : Lecture et affichage des fichiers GPX
- [Chart.js](https://www.chartjs.org/) : Graphique du profil d'élévation
- [Tailwind CSS](https://tailwindcss.com/) : Design moderne et responsive
- [Material Icons](https://fonts.google.com/icons) : Icônes

## Structure du projet

```
base-vtt/
├── index.html           # Page principale
├── css/
│   └── style.css        # Styles personnalisés
├── js/
│   └── app.js           # Logique principale de l'application
├── data/
│   └── *.gpx            # Traces GPX des parcours
├── img/
│   └── ...              # Images, screenshots
└── README.md            # Ce fichier
```

## Installation & utilisation

1. **Cloner le dépôt**
	```bash
	git clone https://github.com/JLecache/base-vtt.git
	cd base-vtt
	```
2. **Ajouter vos traces GPX** dans le dossier `data/` (format .gpx)
3. **Ouvrir `index.html`** dans votre navigateur (aucun backend requis)

> L'application fonctionne 100% en front-end, aucun serveur n'est nécessaire.

## Personnalisation

- Ajoutez/supprimez vos parcours dans le tableau `allRoutes` du fichier `js/app.js`
- Modifiez les couleurs, fonds de carte ou styles dans `config` (`app.js`)
- Ajoutez vos propres images ou logos dans `img/`

## Contribuer

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request pour proposer des améliorations, corriger des bugs ou ajouter de nouveaux parcours.

## Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE).

---

**Auteur :** Julien Lecacheur  
*Contact :* [Voir profil GitHub](https://github.com/JLecache)
