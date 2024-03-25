(function () {
    "use strict";

    var message = document.getElementById("message");
    var turn = document.getElementById("turn");

    var play_again = function () {
        window.location.reload(true);
    };

    var prolog_string2list = function (prolog_string) {
        prolog_string = prolog_string.replace(/(\w+)(\()/g, "$2$1,").replace(/(\w+)/g, "\"$1\"");
        prolog_string = prolog_string.replace(/\(/g, "[").replace(/\)/g, "]");
        return JSON.parse(prolog_string);
    };

    var list2prolog_string = function (list) {
        var prolog_string = JSON.stringify(list).replace(/"/g, "").slice(1, -1);
        return prolog_string.replace(/\[(\w+)\,/g, "$1(").replace(/\]/g, ")").replace(",", "(") + ")";
    };


    function Cell(board, column, row, colour) { // note column, row - not matrix notation
        this.board = board;
        this.column = column;
        this.row = row;
        this.colour = colour;
        this.x = this.board.COLUMNS.indexOf(column) * this.board.SQUARE_LENGTH;
        this.y = this.board.ROWS.indexOf(row) * this.board.SQUARE_LENGTH;
        this.l = this.board.SQUARE_LENGTH;
    }

    Cell.prototype.draw = function (colour) {
        this.board.context.fillStyle = colour;
        this.board.context.fillRect(this.x, this.y, this.l, this.l);
    };

    function Piece(board, column, row, type) { // note column, row - not matrix notation
        this.board = board;
        this.column = column;
        this.row = row;
        this.type = type;
        this.colour = this.board.COLOUR_DICT[this.type];
        this.x_centre = (this.board.COLUMNS.indexOf(this.column) * this.board.SQUARE_LENGTH) + (0.5 * this.board.SQUARE_LENGTH);
        this.y_centre = (this.board.ROWS.indexOf(this.row) * this.board.SQUARE_LENGTH) + (0.5 * this.board.SQUARE_LENGTH);
        this.radius = 0.4 * this.board.SQUARE_LENGTH;
    }

    Piece.prototype.draw = function (colour) {
        this.board.context.fillStyle = colour;
        this.board.context.strokeStyle = colour;
        this.board.context.setLineDash([]);
        this.board.context.lineWidth = 1;
        this.board.context.beginPath();
        this.board.context.arc(this.x_centre, this.y_centre, this.radius, 0, Math.PI * 2);
        this.board.context.closePath();
        this.board.context.fill();
        this.board.context.stroke();
    };

    Piece.prototype.oldpos_draw = function (colour) {
        this.board.context.strokeStyle = colour;
        this.board.context.setLineDash([6, 3]);
        this.board.context.lineWidth = 3;
        this.board.context.beginPath();
        this.board.context.arc(this.x_centre, this.y_centre, this.radius, 0, Math.PI * 2);
        this.board.context.closePath();
        this.board.context.stroke();
    };

    function Board(game) {
        this.DIM = 8;
        this.COLUMNS = ["a", "b", "c", "d", "e", "f", "g", "h"];
        this.ROWS = ["8", "7", "6", "5", "4", "3", "2", "1"];
        this.COLOUR_DICT = {"wp": "darkred", "wk": "tomato", "bp": "black", "bk": "darkgray"};
        this.game = game;
        this.canvas = document.getElementById("board");
        this.context = this.canvas.getContext("2d");
        this.canvas.onclick = this.select.bind(this); // breaks without bind(this)
        this.canvas.onmousemove = this.get_highlight.bind(this);
        this.SQUARE_LENGTH = Math.floor(this.canvas.width / this.DIM);
        this.set_cells(); // reference as this.cells
        this.set_pieces(); // reference as this.pieces
        this.set_clickables();
    }

    Board.prototype.set_cells = function () {
        var cells = [];
        var board = this;
        for (var row = 0; row < this.DIM; row++) {
            for (var column = 0; column < this.DIM; column++) {
                // draw a checker board
                if (((row % 2 === 0) && (column % 2 === 0)) || ((row % 2 === 1) && (column % 2 === 1))) {
                    cells.push(new Cell(board, board.COLUMNS[column], board.ROWS[row], "ghostwhite"));
                } else {
                    cells.push(new Cell(board, board.COLUMNS[column], board.ROWS[row], "silver"));
                }
            }
        }
        this.cells = cells;
    };
    Board.prototype.animateMove = function (startColumn, startRow, endColumn, endRow) {
        var board = this;
        this.game.control = this.game.human_player
        var piece = board.get_piece(startColumn, startRow);
        var originalX = piece.x_centre;
        var originalY = piece.y_centre;
        var destinationCell = board.get_cell(endColumn, endRow);
        var targetX = destinationCell.x + (board.SQUARE_LENGTH / 2);
        var targetY = destinationCell.y + (board.SQUARE_LENGTH / 2);
        var step = 0;
        var totalSteps = 10; // Number of steps for the animation

        var moveInterval = setInterval(function () {
            step++;
            var newX = originalX + (targetX - originalX) * step / totalSteps;
            var newY = originalY + (targetY - originalY) * step / totalSteps;
            piece.x_centre = newX;
            piece.y_centre = newY;

            board.draw(); // Redraw the board with the piece's new position

            if (step >= totalSteps) {
                clearInterval(moveInterval);
                piece.column = endColumn; // Update piece's column and row to reflect its new position
                piece.row = endRow;
                board.draw();
                board.set_pieces();

            }
        }, 20); // Milliseconds between each step
    }

    Board.prototype.get_cell = function (column, row) {
        var cells = this.cells.filter(function (cell) {
            return ((cell.column === column) && (cell.row === row));
        });
        return cells[0];
    };

    Board.prototype.set_pieces = function () { // rename parse_state ?
        var pieces = [];
        var board = this;
        var state_list = prolog_string2list(this.game.state);
        state_list.forEach(function (term) { // maybe use switch... case
            if (term[0] === "control") {
                board.game.control = term[1];
            }
            if (term[0] === "step") {
                board.game.step = term[1];
                turn.textContent = String(102 - board.game.step) + " turns left";
            }
            if ((term[0] === "cell") && (term[3] !== "b")) {
                pieces.push(new Piece(board, term[1], term[2], term[3]));
            }
        });
        this.pieces = pieces;
    };

    Board.prototype.get_piece = function (column, row) {
        var pieces = this.pieces.filter(function (piece) {
            return ((piece.column === column) && (piece.row === row));
        });
        return pieces[0];
    };

    Board.prototype.set_clickables = function () {
        var clickables = "";
        this.game.actions.forEach(function (action) {
            if (clickables.indexOf("(" + action[2][2] + "," + action[2][3] + ")") === -1) {
                clickables = clickables + "(" + action[2][2] + "," + action[2][3] + ")";
            }
        });
        this.clickables = clickables;
    };

    Board.prototype.get_highlight = function (event) {  // rename get_clickables?
        if (this.game.control === this.game.human_player) {
            var rect = this.canvas.getBoundingClientRect();
            var row = this.ROWS[Math.floor((event.clientY - rect.top) / this.SQUARE_LENGTH)];
            var column = this.COLUMNS[Math.floor((event.clientX - rect.left) / this.SQUARE_LENGTH)];
            if (this.clickables.indexOf("(" + column + "," + row + ")") !== -1) {
                this.highlight = [column, row];
                document.body.style.cursor = 'pointer';
            } else {
                delete this.highlight;
                document.body.style.cursor = 'default';
            }
            this.draw();
        }
    };

    Board.prototype.removePieceAt = function (column, row) {
        this.pieces = this.pieces.filter(function (piece) {
            return !(piece.column === column && piece.row === row);
        });

        this.draw();
    };

    Board.prototype.calculateCaptureCell = function (startColumn, startRow, endColumn, endRow) {
        const columns = 'abcdefgh';
        const startColumnIndex = columns.indexOf(startColumn);
        const endColumnIndex = columns.indexOf(endColumn);

        const captureColumn = columns[(startColumnIndex + endColumnIndex) / 2];
        const captureRow = (parseInt(startRow) + parseInt(endRow)) / 2;

        return {captureColumn, captureRow};
    };


    Board.prototype.select = function (event) {
        if (this.game.control === this.game.human_player) {
            var board = this;


            var rect = board.canvas.getBoundingClientRect();
            var row = board.ROWS[Math.floor((event.clientY - rect.top) / board.SQUARE_LENGTH)];
            var column = board.COLUMNS[Math.floor((event.clientX - rect.left) / board.SQUARE_LENGTH)];
            var move_str = "That is not a valid move";
            var type;
            if ((this.from_row === undefined) && (this.clickables.indexOf("(" + column + "," + row + ")") !== -1)) {
                this.from_row = row;
                this.from_column = column;
                this.moves_potential = this.game.actions.filter(function (action) {
                    return ((action[2][2] === board.from_column) && (action[2][3] === board.from_row));
                });
                this.draw();
            } else {
                if ((row === this.from_row) && (column === this.from_column)) {
                    delete this.from_row;
                    delete this.from_column;
                    delete this.moves_potential;
                    this.draw();
                } else {
                    this.moves_potential.forEach(function (move) {
                        if ((move[2][move[2].length - 2] === column) && (move[2][move[2].length - 1] === row)) {
                            move_str = list2prolog_string(move);
                            type = move[2][1];
                        }
                    });
                    if (board.game.legals.indexOf(move_str) > -1) {
                        var piece = board.get_piece(board.from_column, board.from_row);
                        var destinationCell = board.get_cell(column, row);
                        var originalX = piece.x_centre;
                        var originalY = piece.y_centre;
                        var targetX = destinationCell.x + (board.SQUARE_LENGTH / 2);
                        var targetY = destinationCell.y + (board.SQUARE_LENGTH / 2);
                        var step = 0;
                        var totalSteps = 10; // Adjust this number for smoother/faster animation

                        var moveInterval = setInterval(function () {
                            step++;
                            var newX = originalX + (targetX - originalX) * step / totalSteps;
                            var newY = originalY + (targetY - originalY) * step / totalSteps;
                            piece.x_centre = newX;
                            piece.y_centre = newY;
                            board.draw();

                            if (step >= totalSteps) {
                                clearInterval(moveInterval);
                                // Update the state after the animation is complete
                                board.game.state = board.game.state.replace("cell(" + board.from_column + "," + board.from_row + "," + type + ")",
                                    "cell(" + board.from_column + "," + board.from_row + "," + "b)");
                                board.game.state = board.game.state.replace("cell(" + column + "," + row + "," + "b)",
                                    "cell(" + column + "," + row + "," + type + ")");
                                board.set_pieces();
                                const {
                                    captureColumn,
                                    captureRow
                                } = board.calculateCaptureCell(board.from_column, board.from_row, column, row);
                                const capturedPiece = board.get_piece(captureColumn, captureRow.toString());

                                delete board.from_row;
                                delete board.from_column;
                                delete board.moves_potential;
                                board.draw();
                                if (board.game.moves_list === "") {
                                    board.game.moves_list = move_str;
                                    console.log(move_str)
                                } else {
                                    board.game.moves_list = board.game.moves_list + "," + move_str;
                                    console.log(move_str)
                                }
                                if (move_str.includes("doublejump")) {
                                    var moveInfo = board.parseDoubleJumpMove(move_str);
                                    if (moveInfo) {
                                        var captureCells = board.calculateCaptureCellsForDoubleJump(
                                            moveInfo.startColumn, moveInfo.startRow,
                                            moveInfo.middleColumn, moveInfo.middleRow,
                                            moveInfo.endColumn, moveInfo.endRow
                                        );
                                        captureCells.forEach(({captureColumn, captureRow}) => {
                                            var capturedPiece = board.get_piece(captureColumn, captureRow.toString());
                                            if (capturedPiece && capturedPiece.colour !== piece.colour) {
                                                board.removePieceAt(captureColumn, captureRow.toString());
                                            }
                                        });
                                    }
                                }

                                if (move_str.includes("triplejump")) {
                                    var moveInfo = board.parseTripleJumpMove(move_str);
                                    if (moveInfo) {
                                        var captureCells = board.calculateCaptureCellsForTripleJump(
                                            moveInfo.startColumn, moveInfo.startRow,
                                            moveInfo.firstMiddleColumn, moveInfo.firstMiddleRow,
                                            moveInfo.secondMiddleColumn, moveInfo.secondMiddleRow,
                                            moveInfo.endColumn, moveInfo.endRow
                                        );
                                        captureCells.forEach(({captureColumn, captureRow}) => {
                                            var capturedPiece = board.get_piece(captureColumn, captureRow.toString());
                                            if (capturedPiece && capturedPiece.colour !== piece.colour) {
                                                board.removePieceAt(captureColumn, captureRow.toString());
                                            }
                                        });
                                    }
                                }

                                if (capturedPiece && capturedPiece.colour !== piece.colour) {
                                    board.removePieceAt(captureColumn, captureRow.toString());
                                }
                                board.game.create_send_str();
                            }
                        }, 20);
                    } else {
                        message.textContent = move_str; //bug here
                    }
                }
            }
        }
    };

    Board.prototype.parseDoubleJumpMove = function (moveStr) {
        const regex = /doublejump\(wp,([a-h]),(\d),([a-h]),(\d),([a-h]),(\d)\)/;
        const match = moveStr.match(regex);

        if (match) {
            return {
                startColumn: match[1],
                startRow: match[2],
                middleColumn: match[3],
                middleRow: match[4],
                endColumn: match[5],
                endRow: match[6]
            };
        }

        return null;
    };

    Board.prototype.parseTripleJumpMove = function (moveStr) {
        const regex = /triplejump\(wp,([a-h]),(\d),([a-h]),(\d),([a-h]),(\d),([a-h]),(\d),([a-h]),(\d)\)/;
        const match = moveStr.match(regex);

        if (match) {
            return {
                startColumn: match[1],
                startRow: match[2],
                firstMiddleColumn: match[3],
                firstMiddleRow: match[4],
                secondMiddleColumn: match[5],
                secondMiddleRow: match[6],
                endColumn: match[7],
                endRow: match[8]
            };
        }

        return null;
    };

    Board.prototype.calculateCaptureCellsForDoubleJump = function (startColumn, startRow, middleColumn, middleRow, endColumn, endRow) {
        let captureCells = [];
        captureCells.push(this.calculateCaptureCell(startColumn, startRow, middleColumn, middleRow));
        captureCells.push(this.calculateCaptureCell(middleColumn, middleRow, endColumn, endRow));
        return captureCells;
    };

    Board.prototype.calculateCaptureCellsForTripleJump = function (startColumn, startRow, firstMiddleColumn, firstMiddleRow, secondMiddleColumn, secondMiddleRow, endColumn, endRow) {
        let captureCells = [];
        captureCells.push(this.calculateCaptureCell(startColumn, startRow, firstMiddleColumn, firstMiddleRow));
        captureCells.push(this.calculateCaptureCell(firstMiddleColumn, firstMiddleRow, secondMiddleColumn, secondMiddleRow));
        captureCells.push(this.calculateCaptureCell(secondMiddleColumn, secondMiddleRow, endColumn, endRow));
        return captureCells;
    };


    Board.prototype.draw = function () {
        var board = this;
        if (this.game.life_stage === "start") {
            var that = this.game;
            message.innerHTML = 'Choose the side <input id="red" type="button" value="Red">' +
                'or <input id="black" type="button" value="Black">';
            document.getElementById("red").onclick = function () {
                that.set_player("red");
            };
            document.getElementById("black").onclick = function () {
                that.set_player("black");
            };
        }
        this.cells.forEach(function (cell) {
            cell.draw(cell.colour);
        });
        if ((this.from_row !== undefined) && (this.game.control === this.game.human_player)) {
            this.get_cell(this.from_column, this.from_row).draw("greenyellow");
            this.moves_potential.forEach(function (move) {
                var column = move[2][move[2].length - 2];
                var row = move[2][move[2].length - 1];
                board.get_cell(column, row).draw("yellow");
            });
            delete this.highlight;
        }
        if ((this.highlight !== undefined) && (this.game.control === this.game.human_player)) {
            this.get_cell(this.highlight[0], this.highlight[1]).draw("yellow");
        }
        this.pieces.forEach(function (piece) {
            piece.draw(piece.colour);
        });
    };

    function Game() {
        this.init = "[control(red),step(1),piece_count(black,12),piece_count(red,12)," +
            "cell(a,1,b),cell(a,2,wp),cell(a,3,b),cell(a,4,b),cell(a,5,b),cell(a,6,bp),cell(a,7,b),cell(a,8,bp)," +
            "cell(b,1,wp),cell(b,2,b),cell(b,3,wp),cell(b,4,b),cell(b,5,b),cell(b,6,b),cell(b,7,bp),cell(b,8,b)," +
            "cell(c,1,b),cell(c,2,wp),cell(c,3,b),cell(c,4,b),cell(c,5,b),cell(c,6,bp),cell(c,7,b),cell(c,8,bp)," +
            "cell(d,1,wp),cell(d,2,b),cell(d,3,wp),cell(d,4,b),cell(d,5,b),cell(d,6,b),cell(d,7,bp),cell(d,8,b)," +
            "cell(e,1,b),cell(e,2,wp),cell(e,3,b),cell(e,4,b),cell(e,5,b),cell(e,6,bp),cell(e,7,b),cell(e,8,bp)," +
            "cell(f,1,wp),cell(f,2,b),cell(f,3,wp),cell(f,4,b),cell(f,5,b),cell(f,6,b),cell(f,7,bp),cell(f,8,b)," +
            "cell(g,1,b),cell(g,2,wp),cell(g,3,b),cell(g,4,b),cell(g,5,b),cell(g,6,bp),cell(g,7,b),cell(g,8,bp)," +
            "cell(h,1,wp),cell(h,2,b),cell(h,3,wp),cell(h,4,b),cell(h,5,b),cell(h,6,b),cell(h,7,bp),cell(h,8,b)]";
        this.legals = "[does(red,move(wp,b,3,a,4)),does(red,move(wp,b,3,c,4)),does(red,move(wp,d,3,c,4)),does(red,move(wp,d,3,e,4))," +
            "does(red,move(wp,f,3,e,4)),does(red,move(wp,f,3,g,4)),does(red,move(wp,h,3,g,4))]";
        this.state = this.init;
        this.set_actions(); // access as actions
        this.moves_list = "";
        this.roles = ["red", "black"];
        this.control = "red";
        this.red_reward = 50;
        this.black_reward = 50;
        this.life_stage = "start"; // maybe need a pick_piece stage?
        this.step = 0;
        this.board = new Board(this);
        // this.board.update_state();
        this.board.draw();
    }

    Game.prototype.set_actions = function () {
        this.actions = prolog_string2list(this.legals);
    };


    Game.prototype.set_player = function (player) {
        if (player === "red") {
            this.human_player = "red";
            this.ai_player = "black";
            this.control = this.human_player;
            message.textContent = "You to play";
            document.body.style.cursor = 'pointer';
        } else {
            this.human_player = "black";
            this.ai_player = "red";
            // get server to return opening move
            var send_str = "state=" + encodeURIComponent(this.state) +
                "&aiplayer=" + encodeURIComponent(this.ai_player) +
                "&moves=" + encodeURIComponent("[noop]"); // bug needs fixing
            this.server_call(send_str);
        }
        this.life_stage = "underway"; // rather use gdl notation start, play, stop
    };


    Game.prototype.make_move = function (response) {
        response = response.split("&");
        this.state = response[0].split("=")[1];
        this.legals = response[1].split("=")[1];
        this.red_reward = response[2].split("=")[1];
        this.black_reward = response[3].split("=")[1];
        if (response[4].split("=")[1] === "true") {
            this.life_stage = "over";
        } else {
            this.life_stage = "underway";
            this.control = this.human_player;
            message.textContent = "You to play";
            document.body.style.cursor = 'pointer';
        }
        var move = response[5].split("=")[1];
        if (move !== "noop") {
            var match = move.match(/move\((\w+),(\w+),(\d+),(\w+),(\d+)\)/);
            if (match) {
                var startColumn = match[2]; // g
                var startRow = match[3]; // 6
                var endColumn = match[4]; // h
                var endRow = match[5]; // 5
                this.board.animateMove(startColumn, startRow, endColumn, endRow);


            }
            if (this.moves_list === "") {
                this.moves_list = move;
            } else {
                this.moves_list = this.moves_list + "," + move;
            }
        }

        this.set_actions();
        this.board.set_clickables();
        if (this.life_stage === "over") {
            message.innerHTML = "Game Over! Red " + this.red_reward + ", Black " + this.black_reward +
                ' <input id="game_over" type="button" value="Play Again?">';
            document.getElementById("game_over").onclick = function () {
                play_again();
            };
        }
    };

    Game.prototype.server_response = function () {
        if (this.httpRequest.readyState === XMLHttpRequest.DONE) {
            if (this.httpRequest.status === 200) {
                this.make_move(this.httpRequest.responseText);
            } else {
                alert("There was a problem with the request.");
            }
        }
    };

    Game.prototype.server_call = function (send_str) {
        this.control = this.ai_player;
        message.textContent = "Wait for AI to move..";
        document.body.style.cursor = 'wait';
        this.httpRequest = new XMLHttpRequest();
        if (!this.httpRequest) {
            alert("Giving up :( Cannot create an XMLHTTP instance");
            return false;
        }
        this.httpRequest.onreadystatechange = this.server_response.bind(this);
        this.httpRequest.open("POST", "/move");
        this.httpRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        this.httpRequest.send(send_str);
    };


    Game.prototype.create_send_str = function () {
        var send_str = "state=" + encodeURIComponent(this.state) +
            "&aiplayer=" + encodeURIComponent(this.ai_player) +
            "&moves=" + encodeURIComponent("[" + this.moves_list + "]");
        console.log(this.moves_list)
        this.server_call(send_str);
    };

    var game = new Game();
}());

