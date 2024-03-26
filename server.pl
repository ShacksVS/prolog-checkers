:- use_module(library(http/thread_httpd)).
:- use_module(library(http/http_dispatch)).
:- use_module(library(http/http_unix_daemon)).
:- use_module(library(http/http_files)).
:- use_module(library(http/http_client)).

:- initialization main.

:- http_handler(root(.), http_reply_from_files('.', []), [prefix]).
:- http_handler('/move', move_handler, []).

move_handler(Request) :-
  member(method(post), Request), !,
  http_read_data(Request, [state=StateString, aiplayer=AIplayerString, moves=MovesString|_], []),
  term_string(Moves, MovesString),
  last(Moves, Move0),
  term_string(State0, StateString),
  term_string(AIplayer, AIplayerString),
  (Move0 = noop, !,
    State0 = State1
  ;
    findnext(State0, Move0, State1)),
  findterminalp(State1, Terminal1),
  (Terminal1, !,
    Move1 = noop,
    State2 = State1,
    Terminal2 = true,
    findreward(red, State2, RedReward),
    findreward(black, State2, BlackReward)
  ;
    bestmove(State1, Move1),
    findnext(State1, Move1, State2),
    findreward(red, State2, RedReward),
    findreward(black, State2, BlackReward),
    findterminalp(State2, Terminal2)
  ),
  (Terminal2, !,
    Legals = []
  ;
    (AIplayer = black, !, HumanPlayer = red ; HumanPlayer = black),
    findlegals(HumanPlayer, State2, Legals)
  ),
  format('Content-type: application/x-www-form-urlencoded~n~n', []),
  format('state=~w&legals=~w&x-reward=~w&y-reward=~w&terminal=~w&ai_move=~w',
         [State2, Legals, RedReward, BlackReward, Terminal2, Move1]).

main :-
  consult('checkers.pl'),
  consult('ggp_alphabeta.pl'),
  http_daemon.
