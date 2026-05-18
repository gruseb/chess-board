## Solved:

1. Als Benutzer möchte ich ein digitales Schachbrett sehen, auf dem ich die Standardstartaufstellung sehen kann.
2. Als Benutzer möchte ich mit der Maus auf ein bestimmtes Feld klicken können, um zu sehen, welche Figur darauf steht. Wenn keine Figur vorhanden ist, möchte ich eine visuelle Feedback erhalten, dass das Feld leer ist.
3. Als Benutzer möchte ich in der Lage sein, eine Figur auf dem Brett per Drag-and-Drop an eine neue Position zu bewegen, um eine Partie zu simulieren.
4. Als Benutzer möchte ich, dass das Programm die Regeln des Schachs einhält, sodass ich keine unmöglichen Züge ausführen kann (z. B. einen Bauern nach hinten bewegen).
5. Als Benutzer möchte ich, dass das Programm die gegnerischen Figuren ebenfalls anzeigt, sodass ich eine vollständige Partie simulieren kann.
6. Als Benutzer möchte ich im Falle einer Schachmatt- oder Patt-Situation eine entsprechende Meldung auf dem Bildschirm erhalten.
7. Als Benutzer möchte ich die Möglichkeit haben, ein neues Spiel zu starten, um eine Partie mit der Startaufstellung zu beginnen.
8. Als Benutzer möchte ich, dass das Programm nach jedem Zug automatisch prüft, ob ein Schachmatt oder Patt eingetreten ist.
9. Als Benutzer möchte ich, dass ich eine Game-History, wo ich mir alle meine Partien ansehen kann.
10. Als User möchte ich gegen Stockfish spielen können und die Schwierigkeit anpassen können.
11. Als User möchte ich, möchte ich in der Navbar einen Reiter sehen, wo ich meine Partien sehen kann und wenn ich auf eine Partie klicke, kann ich mir diese ansehen und die Züge nachvollziehen.
12. Ich möchte einen Button haben, dass ich die Partie bis zu diesem Zeitpunkt speichern kann und mir diese später ansehen kann.
13. Ich möchte einen Button haben, wo ich die Position speichern kann, damit ich sie später noch einmal öffnen kann.
14. Ich möchte mir die gespeicherten Positionen ansehen können. Wie es eine Game-History gibt, sollte es auch eine Position-History geben, wo ich mir die gespeicherten Positionen ansehen kann.

15. Als Benuter möchte ich, die Möglichkeit haben, durch die Züge derPartien durchzuklicken, die ich mir angesehen habe, damit ich die Züge nachvollziehen kann.

16. Als Benutzer möchte ich in der Navbar einen Reiter Analyse haben, wo ich beispielsweise wie in Lichess eine Evaluation bar sehe, die mir die Vorteile der einen oder anderen Seite anzeigt.
    17.1 Sollte es die Möglichkeit geben, Untervarianten zu erzeugen, das dann wie ein "Variantenbaum" aussieht.
17. Als Nutzer möchte ich mir eine Stockfish Analyse zu einer Partie oder zu einer Stellung ansehen können. Es sollte Unterschiedlichen Aktionen geben:
    18.1 Bei Positions: Weiterspielen; Stockfish analysieren lassen;
    18.2 Bei Partie: Stockfish analysieren, selbst analysieren, partie fortsetzen, partie löschen. Die Stockfish Analyse sollte allerdings erst einen Tag nach Speichern verfügbar sein.

18. Als Nutzer möchte ich Taktikaufgaben angezeigt bekommen, bei dem ich nach Elo die Schwierigkeit auswählen können. Diese Aufgaben sollten nicht mein Lichess Taktikrating ändern
19. Als Nutzer möchte ich die Taktikaufgaben in der DB speichern, eine Tabelle für wrongTactics sollte erstellt werden.(vllt wäre es smart, es mit positionen zu verbinden) Die Spaltern der Tabelle: Rating, Topics; Vllt. ist es auch möglich, dann einen unterreiter "retry wrong tactics" hinzuzufügen. Mit verbundenen Supabase Projekt!
20. neue designs, dass man rechts oben auswählen kann
21. Man sollte sich als User registrieren können und dann einloggen können, ich möchte mit meinem account auch Accounts löschen können.
22. Die User Infos sollten im LocalStorage gespeichert werden, so dass ich mich nicht immer anmelden muss

## not solved:

1. Als Benutzer möchte ich, viele bereiche des Endspiels trainieren können. Dafür kann man Kurse erstellen, wo man ein Endspiel lösen muss und das Programm bewertet ob es richtig war. Der Kurs sollte erklären, wie man diesen Endspieltyp spielt und welche Fehler häufig passieren.
2. falsche Zuganzahl

3. Wenn die Website neu geöffnet wird, dann sollten alle neuen Schnellschachpartien von dem User angezeigt werden, wenn er auf den Button "Jetzt synchronisieren" drückt. enn der User sein Lichess-Account angegeben hat. (muss noch überprüft werden, ob es funktioniert!!!!!!!)

4. Als Benutzer möchte ich wichtige Stellungen (keine klassischen Taktikpuzzles) aus meinen privaten Lichess-Studien importieren und trainieren können.
   - Ein Zug, der in der Lichess-Studie mit einem Rufzeichen (`!` oder `!!`) markiert ist, gilt als der gesuchte „wichtige Zug“.
   - Die Stellung (FEN) *vor* diesem Zug wird als Trainingsstellung gespeichert.
   - Der Studienkommentar, der in der Studie VOR oder NACH diesem Zug hinzugefügt wurde, soll beim erfolgreichen Lösen als Erklärung angezeigt werden.
   - In der Datenbank (`public.position` Tabelle) soll ersichtlich sein, zu welcher Lichess-Studie diese Stellung gehört (über optionale Felder `study_id` und `study_title`). Wenn eine Stellung nicht aus einer Lichess-Studie stammt, müssen diese Felder `null` sein.
   - Es soll ein eigener Trainingsreiter oder Bereich für diese Studien-Positionen existieren, in dem man die importierten Positionen strukturiert trainieren kann.



