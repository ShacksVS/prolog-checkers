type Board = -- your Board type here
type Color = -- your Color type here, presumably White or Black
type Depth = Int
type Score = Int
type Move = ((Int, Int), (Int, Int)) -- Adjust according to your Move representation
type Alpha = Int
type Beta = Int

data Figure = E | F Color | K Color deriving (Eq, Show)
data Player = White | Black deriving (Eq, Show)

-- Function to calculate minimax value and the best move
minimax :: Board -> Color -> Depth -> Score -> Alpha -> Beta -> (Score, Move)
minimax board color depth score alpha beta
    | depth == 0 || null moves = (evaluateBoard board color + score, ((-1, -1), (-1, -1)))
    | otherwise = bestMove moves alpha beta
    where
        moves = getAllMoves board color
        evaluateBoard = getBoardScore
        isMaximizingPlayer = color == White
        bestMove = foldl (evaluateBestMove board color depth score isMaximizingPlayer) (initialScore, ((-1, -1), (-1, -1)))
        initialScore = if isMaximizingPlayer then -infinity else infinity
        infinity = 1000000

-- Helper function to evaluate the best move during fold
evaluateBestMove :: Board -> Color -> Depth -> Score -> Bool -> (Score, Move) -> Move -> (Score, Move)
evaluateBestMove board color depth score isMaximizingPlayer (currentBestScore, currentBestMove) move =
    let (newScore, _) = minimax (applyMove board move) (opponent color) (depth - 1) score alpha beta
        betterScore = if isMaximizingPlayer then max currentBestScore newScore else min currentBestScore newScore
    in if betterScore == newScore then (betterScore, move) else (currentBestScore, currentBestMove)

applyMove :: Board -> Move -> Board
applyMove board move = -- Your implementation here

getAllMoves :: Board -> Color -> [Move]
getAllMoves board color = -- Your implementation here

getBoardScore :: Board -> Color -> Score
getBoardScore board color = sum [getScoreDiff board color pos fig | (pos, fig) <- boardAssocs board]

getScoreDiff :: Board -> Color -> (Int, Int) -> Figure -> Score
getScoreDiff board color pos fig
    | color == colorAt fig = getFigScore fig
    | otherwise = negate $ getFigScore fig
    where
        getFigScore E = 0
        getFigScore (F White) = 10
        getFigScore (F Black) = -10
        getFigScore (K White) = 20
        getFigScore (K Black) = -20

colorAt :: Figure -> Color
colorAt (F c) = c
colorAt (K c) = c

opponent :: Color -> Color
opponent White = Black
opponent Black = White
