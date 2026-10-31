# Parna proga

Risanka-igra v slogu 1930-ih (gumijasti liki, kipeče črnilne obrobe, filmsko zrno, ragtime) za dva igralca z Xbox kontrolerjema: skupaj vozita parni vlak od Jesenic do Nove Gorice. Pogled od zgoraj v psevdo-3D.

**Igraj na spletu:** https://poletko.github.io/train/

**Zagon doma:** odpri `index.html` v Chromu ali Firefoxu (strežnik ni potreben). Na naslovnem zaslonu vsak igralec pritisne A na svojem kontrolerju – prvi je strojevodja, drugi kurjač. Navidezni dvojniki (npr. `xboxdrv`) se samodejno prezrejo. Vsak igralec lahko igra tudi s tipkovnico (glej naslovni zaslon).

## Vloge
| | Vožnja | Postanek |
|---|---|---|
| **P1 strojevodja** | regulator (palica/d-pad ↕), zavora LT, pesek A, piščalka B, smer Y | lik na peronu: pobira zaboje, vodi potnike v vrsti do vagona, razklada (A), Y pripravljen |
| **P2 kurjač** | lopata A, injektor RT, loputa ↔ | po pravilih s table izračuna zaloge in jih naloži z viličarjem: premog (vozi s kupa v tender), voda (drži A pri stolpu, B izpust), pesek (vreče v peščenik), Y pripravljen |

## Vmesne igre
- **Jesenice → Bled: hlod čez progo.** Ustavi pred drevesom (sicer −15). Igralca žagata z dvoročno žago: oba držita palico LEVO, nato oba DESNO. Če nista usklajena, žaga obtiči. Hitreje ko prežagata, več točk (do +40).
- **Bled → Bohinjska Bistrica: skakalnica čez kanjon.** Na klančino pripelji z vsaj 55 km/h in vlak preleti kanjon (+50). Če je prepočasen, pade v kanjon; po 3 rešenih računih ga žerjav potegne nazaj za nov zalet.
- **Bohinjska Bistrica → Podbrdo: zmaj napade vlak.** Pogled od strani, igralca sta na strehi vagonov (palica = hoja). Najprej mečeta premog (A), ki zmaja samo žgečka. V laboratoriju (Y pri loputi vijoličnega vagona) rešita 3 račune in dobita katapult; ta zmaja zadene, a ga ne ustavi. Drugič v laboratoriju dobita balisto z mrežo: 3 zadetki in zmaj odleti (+50). Pri orožju: A naloži/izstreli, palica gor/dol meri. Zmajev ogenj igralca za hip omami (−2).

## Izzivi na poti
- **Otroci ob progi:** zatrobi jim (B) in dobiš dodatne točke.
- **Kurjačev račun:** tu in tam med vožnjo mora kurjač rešiti račun (45 s); medtem ne more metati premoga.
- **Postaja:** strojevodja mora poleg prelaganja še naoljiti kolesa in očistiti piščalko (drži A). Potnike, ki ti sledijo, pustiš z B.
- **Ovce na progi:** strojevodja jih prežene s piščalko (B). Če ne zatrobi, ovce ustavijo vlak (−15).
- **Skladišče premoga:** ko premoga zmanjkuje (pod 700 kg), se ob progi pojavi skladišče. Ustavi pri H in plačaj premog z računi (vsak pravilen račun = 1 voz).
- **Zaloge pošle:** kazen je račun. Ko ga rešiš, dobiš zasilno rezervo.
- **Hitrost:** prehiter vlak v ovinku iztiri, lesen most (50 km/h) se pri več kot 75 km/h podre. Obe nesreči imata animacijo in sliko na koncu.

## Razvoj
- `tools/calibrate.js` – avtopilot v nodu, izpiše porabo po odsekih (za umerjanje formul v priročniku kurjača).
- `index.html#auto-x600` – avtopilot v brskalniku preigra celo igro; `#auto-short-x600` preizkusi premalo zalog.
- `index.html#drive@11900` – skok na vožnjo na izbrani razdalji (npr. v predor); dodatno `v27` = hitrost v m/s, `c650` = premog v kg, `sheep` = ovce tik pred vlakom, `quiz` = račun v skladišču. Npr. `#drive@2600v27` podre most. `#station` – prva postaja.
- `#ev-saw`, `#ev-jump` (`#ev-jump-slow` za padec), `#ev-dragon` – takoj v vmesno igro. Za posnetke: `#auto-nopad-stop0.01-ev-jump-ff4` (`ff<s>` previje igro za s sekund, `stop<s>` jo tam ustavi).
- `#auto-real-x30` – avtopilot igra tudi postaje s pravimi kontrolami; `#auto-real-lazy-x10` odpelje brez zalog (kazenski računi, skladišče).
