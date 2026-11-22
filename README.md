# Sphere Card (FR)

Carte Home Assistant pour suivre et régler les **sphères vocales ESPHome** des enfants (Xiaozhi Ball / Spotpear ESP32-S3) :

- une carte par sphère : état de l'assistant (au repos, écoute, réfléchit, répond, micro coupé, hors ligne) ;
- personnage de la sphère, batterie (% et tension), signal Wi-Fi ;
- défis réussis (avec remise à zéro confirmée) et histoires bonus (+ / − pour en offrir ou en retirer) ;
- écran (marche/arrêt et luminosité), volume ;
- LED : marche/arrêt, luminosité, nuancier de 9 couleurs + couleur personnalisée, effets (fixe, pulsation lente ou rapide) ;
- micro, haut-parleur, son de réveil, son de démarrage, texte à l'écran ;
- assistant, mot d'activation, zoom caméra ;
- message à annoncer sur la sphère.

Style verre, thème clair/sombre automatique, nuance de couleur commune aux cartes Johan854, éditeur visuel, textes en français.

## Installation (HACS)
HACS → ⋮ → Dépôts personnalisés → l'URL de ce dépôt, catégorie **Tableau de bord**, puis Ctrl+Maj+R.

## Exemple (une carte par sphère)
```yaml
type: custom:sphere-card
name: Sphère Shaun
prefix: sphere_shaun
image: https://github.com/Johan854/sphere-ai-images/raw/main/images/MaxDresseur/240x240/idle.png
counter: counter.shaun_histoires_bonus
nuance: lavande
```
```yaml
type: custom:sphere-card
name: Sphère Logan
prefix: sphere_logan
image: https://github.com/Johan854/sphere-ai-images/raw/main/images/Pixel/240x240/idle.png
counter: counter.logan_histoires_bonus
nuance: foret
```

## Entités utilisées
Le `prefix` est le nom de l'appareil ESPHome dans les identifiants d'entités (`sphere_shaun` → `light.sphere_shaun_screen`…).

| Rôle | Entité |
|---|---|
| État de l'assistant | `assist_satellite.<prefix>_satellite_assist` |
| Volume | `media_player.<prefix>` |
| Écran / LED | `light.<prefix>_screen` / `light.<prefix>` |
| Micro, haut-parleur, sons, texte | `switch.<prefix>_mute`, `_speaker_enable`, `_wake_sound`, `_startup_sound`, `_show_text` |
| Batterie, tension, Wi-Fi | `sensor.<prefix>_batterie`, `_batterie_tension`, `sensor.<prefix>_<prefix>_wifi_signal_percent` |
| Défis | `sensor.<prefix>_defis_reussis`, `button.<prefix>_remise_a_zero_des_defis` |
| Réglages | `select.<prefix>_assistant`, `_mot_d_activation`, `_zoom_camera` |

Une entité différente peut être imposée avec `entities:` (ex. `entities: { bat: sensor.ma_batterie }`). Les clés : `sat`, `mp`, `screen`, `led`, `mute`, `speaker`, `wake`, `startup`, `text`, `bat`, `volt`, `wifi`, `defis`, `assistant`, `wakeword`, `zoom`, `reset`.

## Options
| Option | Défaut | Description |
|---|---|---|
| `name` | `Sphère Shaun` | Nom affiché |
| `prefix` | `sphere_shaun` | Préfixe des entités de la sphère |
| `image` | personnage Max | Image ronde du personnage (URL) |
| `counter` | `counter.shaun_histoires_bonus` | Compteur d'histoires bonus (facultatif, vide = masqué) |
| `entities` | — | Entités imposées (voir plus haut) |
| `show_advanced` | `true` | Afficher assistant, mot d'activation et zoom caméra |
| `theme` | `auto` | `auto`, `light` ou `dark` |
| `nuance` / `intensite` | selon le thème / 1 | Nuance de couleur commune aux cartes Johan854 |
