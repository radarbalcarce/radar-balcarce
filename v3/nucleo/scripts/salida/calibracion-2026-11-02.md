# Calibración de umbrales · 2026-11-02

Pares: 184 (100 «mismo hecho», 84 «distinto»). Modelo: `@cf/baai/bge-m3`.

**Límites.** El sistema viejo no guarda el título de cada fuente: el texto de cada una es el título sacado de su dirección más el «aporte» (lo que contó ese medio). Y el agrupado del viejo no es infalible: algunos «distinto» muy parecidos pueden ser errores suyos.

## Propuesta

- `unir`: **0.79** (donde entran 1.2 % de los distintos)
- `duda`: **0.70** (donde se recupera 50.0 % de los mismos)
- Ojo: Ningún umbral probado recupera el 95 % de los mismos: se toma el más bajo (0.70).

## Tabla

| Umbral | Mismos arriba | % mismos | Distintos arriba | % distintos |
|---|---|---|---|---|
| 0.70 | 50 | 50.0 % | 4 | 4.8 % |
| 0.71 | 49 | 49.0 % | 4 | 4.8 % |
| 0.72 | 46 | 46.0 % | 4 | 4.8 % |
| 0.73 | 44 | 44.0 % | 4 | 4.8 % |
| 0.74 | 39 | 39.0 % | 4 | 4.8 % |
| 0.75 | 36 | 36.0 % | 3 | 3.6 % |
| 0.76 | 32 | 32.0 % | 2 | 2.4 % |
| 0.77 | 25 | 25.0 % | 2 | 2.4 % |
| 0.78 | 21 | 21.0 % | 2 | 2.4 % |
| 0.79 | 18 | 18.0 % | 1 | 1.2 % |
| 0.80 | 16 | 16.0 % | 1 | 1.2 % |
| 0.81 | 14 | 14.0 % | 1 | 1.2 % |
| 0.82 | 12 | 12.0 % | 1 | 1.2 % |
| 0.83 | 8 | 8.0 % | 0 | 0.0 % |
| 0.84 | 8 | 8.0 % | 0 | 0.0 % |
| 0.85 | 6 | 6.0 % | 0 | 0.0 % |
| 0.86 | 5 | 5.0 % | 0 | 0.0 % |
| 0.87 | 5 | 5.0 % | 0 | 0.0 % |
| 0.88 | 5 | 5.0 % | 0 | 0.0 % |
| 0.89 | 4 | 4.0 % | 0 | 0.0 % |
| 0.90 | 4 | 4.0 % | 0 | 0.0 % |
| 0.91 | 4 | 4.0 % | 0 | 0.0 % |
| 0.92 | 3 | 3.0 % | 0 | 0.0 % |
| 0.93 | 2 | 2.0 % | 0 | 0.0 % |
| 0.94 | 2 | 2.0 % | 0 | 0.0 % |
| 0.95 | 1 | 1.0 % | 0 | 0.0 % |

## Pares mal ubicados con la propuesta

1. DISTINTO que quedó arriba de «unir» · coseno 0.821
   - A (Radio Mitre): todos los aumentos que llegan desde el 1 de noviembre tarifas de luz y gas colectivos prepagas alquileres y peajes
   - B (Clarín): aumentos vienen noviembre suben colectivos prepagas alquileres peajes tarifas luz gas 0
   - https://radiomitre.cienradios.com/sociedad/todos-los-aumentos-que-llegan-desde-el-1-de-noviembre-tarifas-de-luz-y-gas-colectivos-prepagas-alquileres-y-peajes/
   - https://www.clarin.com/economia/aumentos-vienen-noviembre-suben-colectivos-prepagas-alquileres-peajes-tarifas-luz-gas_0_dloOD89Cnf.html
2. MISMO hecho que quedó debajo de «duda» · coseno 0.345
   - A (El Diario Balcarce): podio para lencina ariel grave y bazan marin en el karting regional 305
   - B (Acción 5 (Balcarce)): padel meritoria actuacion de balcarcenos en el argentino
   - https://eldiariobalcarce.com.ar/podio-para-lencina-ariel-grave-y-bazan-marin-en-el-karting-regional-305
   - https://accion5.com/padel-meritoria-actuacion-de-balcarcenos-en-el-argentino/
3. MISMO hecho que quedó debajo de «duda» · coseno 0.363
   - A (El Día): agenda septimo dia. Detalló la agenda de espectáculos, ferias y conciertos en La Plata.
   - B (Infobrisas (Radio Brisas)): la agenda deportiva de este lunes
   - https://www.eldia.com/espectaculos/agenda-septimo-dia_1793514734
   - https://www.infobrisas.com/noticias/2026/11/02/113376-la-agenda-deportiva-de-este-lunes
4. MISMO hecho que quedó debajo de «duda» · coseno 0.407
   - A (C5N): segui vivo el discurso javier milei neuquen n253103. Informó la llegada del presidente Javier Milei a Neuquén para inaugurar un templo evangélico en la calle Lastra al 3100.
   - B (TyC Sports): ver boca vs river segui en vivo por tv el superclasico id769167. Precisó el horario de las 15, el estadio La Bombonera, el árbitro Nicolás Ramírez y los canales de televisión para ver el Superclásico.
   - https://www.c5n.com/politica/segui-vivo-el-discurso-javier-milei-neuquen-n253103
   - https://www.tycsports.com/river-plate/ver-boca-vs-river-segui-en-vivo-por-tv-el-superclasico-id769167.html
5. MISMO hecho que quedó debajo de «duda» · coseno 0.421
   - A (El Destape): duda leonardo ponzio defensa river enfrentar boca
   - B (TN (Todo Noticias)): quien es el arbitro del superclasico y cuales son sus antecedentes con boca y river
   - https://www.eldestapeweb.com/deportes/duda-leonardo-ponzio-defensa-river-enfrentar-boca-2026111103010
   - https://tn.com.ar/deportes/futbol/2026/11/01/quien-es-el-arbitro-del-superclasico-y-cuales-son-sus-antecedentes-con-boca-y-river/
6. MISMO hecho que quedó debajo de «duda» · coseno 0.430
   - A (TyC Sports): que se le viene a boca tras el superclasico y la chance de ganar cinco titulos id769047. Aporta las declaraciones del entrenador Arruabarrena sobre la postura del plantel ante los objetivos.
   - B (Bolavip Argentina): boca hoy los 5 titulos que puede ganar el elogio de riquelme a villa y mas
   - https://www.tycsports.com/boca-juniors/que-se-le-viene-a-boca-tras-el-superclasico-y-la-chance-de-ganar-cinco-titulos-id769047.html
   - https://bolavip.com/ar/boca/boca-hoy-los-5-titulos-que-puede-ganar-el-elogio-de-riquelme-a-villa-y-mas
7. MISMO hecho que quedó debajo de «duda» · coseno 0.438
   - A (TyC Sports): manchester city vs brighton en vivo donde ver por tv y online id769181. Aportó la información sobre los canales de televisión y las plataformas de streaming habilitadas para la transmisión del encuent
   - B (Olé): manchester city envivo premier league enzo fernandez 0
   - https://www.tycsports.com/premier-league/manchester-city-vs-brighton-en-vivo-donde-ver-por-tv-y-online-id769181.html
   - https://www.ole.com.ar/futbol-internacional/inglaterra/manchester-city-envivo-premier-league-enzo-fernandez_0_3fJrSzp8gr.html
8. MISMO hecho que quedó debajo de «duda» · coseno 0.452
   - A (La Nueva): 11 1 19 37 0 como seran las elecciones de esta semana en los ee uu y cual puede ser su impacto en la argentina. Detalla el sistema electoral, las cifras de votantes, los sondeos y el impacto potencial
   - B (El Destape): elecciones estados unidos 2026 mitad termino fecha cuando vota elige
   - https://www.lanueva.com/nota/2026-11-1-19-37-0-como-seran-las-elecciones-de-esta-semana-en-los-ee-uu-y-cual-puede-ser-su-impacto-en-la-argentina
   - https://www.eldestapeweb.com/internacionales/elecciones-estados-unidos-2026-mitad-termino-fecha-cuando-vota-elige-2026820142915
9. MISMO hecho que quedó debajo de «duda» · coseno 0.471
   - A (TyC Sports): argentina torneo clausura 2026 independiente riv m vs banfield fecha 15 id769686
   - B (Clarín): platense vs central cordoba sde vivo hora juegan formaciones ver partido torneo clausura 0
   - https://www.tycsports.com/liga-profesional-de-futbol/argentina-torneo-clausura-2026-independiente-riv-m-vs-banfield-fecha-15-id769686.html
   - https://www.clarin.com/deportes/platense-vs-central-cordoba-sde-vivo-hora-juegan-formaciones-ver-partido-torneo-clausura_0_6SUZRi8mY6.html
10. MISMO hecho que quedó debajo de «duda» · coseno 0.474
   - A (0221): inicia la segunda etapa venta entradas estudiantes la final palmeiras n136766. Informó sobre el inicio de la segunda etapa de venta de entradas.
   - B (Olé): bronca estudiantes volaron plateas final copa libertadores exploto reventa conmebol 0
   - https://www.0221.com.ar/estudiantes/inicia-la-segunda-etapa-venta-entradas-estudiantes-la-final-palmeiras-n136766
   - https://www.ole.com.ar/estudiantes/bronca-estudiantes-volaron-plateas-final-copa-libertadores-exploto-reventa-conmebol_0_XOeWSh5pcy.html
