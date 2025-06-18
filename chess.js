class ChineseChess {
    constructor() {
        this.canvas = document.getElementById('chess-board');
        this.ctx = this.canvas.getContext('2d');
        this.currentPlayer = 'red'; // 'red' or 'black'
        this.selectedPiece = null;
        this.gameStatus = 'playing'; // 'playing', 'checkmate', 'stalemate', 'check'
        this.capturedPieces = { red: [], black: [] };
        this.isInCheck = false;
        this.isOnline = false;
        this.socket = null;
        this.roomId = null;
        this.playerSide = null; // 'red' or 'black' for online games
        
        // 棋盘配置
        this.boardWidth = 540;
        this.boardHeight = 600;
        this.cellSize = 60;
        this.startX = 30;
        this.startY = 30;
        
        // 初始化棋盘
        this.initBoard();
        this.bindEvents();
        this.drawBoard();
        this.updateUI();
        this.initOnlineFeatures();
    }
    
    initBoard() {
        // 初始化棋盘状态 (9x10)
        this.board = [
            ['r', 'n', 'b', 'a', 'k', 'a', 'b', 'n', 'r'],
            [null, null, null, null, null, null, null, null, null],
            [null, 'c', null, null, null, null, null, 'c', null],
            ['p', null, 'p', null, 'p', null, 'p', null, 'p'],
            [null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null],
            ['P', null, 'P', null, 'P', null, 'P', null, 'P'],
            [null, 'C', null, null, null, null, null, 'C', null],
            [null, null, null, null, null, null, null, null, null],
            ['R', 'N', 'B', 'A', 'K', 'A', 'B', 'N', 'R']
        ];
        
        // 棋子名称映射
        this.pieceNames = {
            'k': '将', 'K': '帅',
            'a': '士', 'A': '仕',
            'b': '象', 'B': '相',
            'n': '马', 'N': '马',
            'r': '车', 'R': '车',
            'c': '炮', 'C': '炮',
            'p': '卒', 'P': '兵'
        };
    }
    
    bindEvents() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        document.getElementById('reset-btn').addEventListener('click', () => this.resetGame());
        document.getElementById('online-btn').addEventListener('click', () => this.toggleOnlineMode());
        document.getElementById('create-room-btn').addEventListener('click', () => this.createRoom());
        document.getElementById('join-room-btn').addEventListener('click', () => this.joinRoom());
    }
    
    handleClick(e) {
        if (this.gameStatus !== 'playing') return;
        
        // 在联机模式下，检查是否轮到自己
        if (this.isOnline && this.playerSide && this.currentPlayer !== this.playerSide) {
            this.showMessage('还没轮到你的回合！');
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const col = Math.round((x - this.startX) / this.cellSize);
        const row = Math.round((y - this.startY) / this.cellSize);
        
        if (col < 0 || col > 8 || row < 0 || row > 9) return;
        
        if (this.selectedPiece) {
            // 尝试移动棋子
            if (this.isValidMove(this.selectedPiece.row, this.selectedPiece.col, row, col)) {
                this.movePiece(this.selectedPiece.row, this.selectedPiece.col, row, col);
                this.selectedPiece = null;
                this.switchPlayer();
            } else {
                this.selectedPiece = null;
            }
        } else {
            // 选择棋子
            const piece = this.board[row][col];
            if (piece && this.isPieceOwnedByCurrentPlayer(piece)) {
                this.selectedPiece = { row, col, piece };
            }
        }
        
        this.drawBoard();
        this.updateUI();
    }
    
    isPieceOwnedByCurrentPlayer(piece) {
        if (this.currentPlayer === 'red') {
            return piece === piece.toUpperCase(); // 红方是大写
        } else {
            return piece === piece.toLowerCase(); // 黑方是小写
        }
    }
    
    isValidMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const targetPiece = this.board[toRow][toCol];
        
        // 不能吃自己的棋子
        if (targetPiece && this.isPieceOwnedByCurrentPlayer(targetPiece)) {
            return false;
        }
        
        // 根据棋子类型检查移动规则
        switch (piece.toLowerCase()) {
            case 'k': return this.isValidKingMove(fromRow, fromCol, toRow, toCol);
            case 'a': return this.isValidAdvisorMove(fromRow, fromCol, toRow, toCol);
            case 'b': return this.isValidBishopMove(fromRow, fromCol, toRow, toCol);
            case 'n': return this.isValidKnightMove(fromRow, fromCol, toRow, toCol);
            case 'r': return this.isValidRookMove(fromRow, fromCol, toRow, toCol);
            case 'c': return this.isValidCannonMove(fromRow, fromCol, toRow, toCol);
            case 'p': return this.isValidPawnMove(fromRow, fromCol, toRow, toCol);
            default: return false;
        }
    }
    
    isValidKingMove(fromRow, fromCol, toRow, toCol) {
        // 将/帅只能在九宫格内移动，每次只能移动一格
        const isRed = this.board[fromRow][fromCol] === this.board[fromRow][fromCol].toUpperCase();
        const palaceRows = isRed ? [7, 8, 9] : [0, 1, 2];
        const palaceCols = [3, 4, 5];
        
        if (!palaceRows.includes(toRow) || !palaceCols.includes(toCol)) {
            return false;
        }
        
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }
    
    isValidAdvisorMove(fromRow, fromCol, toRow, toCol) {
        // 士只能在九宫格内斜向移动
        const isRed = this.board[fromRow][fromCol] === this.board[fromRow][fromCol].toUpperCase();
        const palaceRows = isRed ? [7, 8, 9] : [0, 1, 2];
        const palaceCols = [3, 4, 5];
        
        if (!palaceRows.includes(toRow) || !palaceCols.includes(toCol)) {
            return false;
        }
        
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        
        return rowDiff === 1 && colDiff === 1;
    }
    
    isValidBishopMove(fromRow, fromCol, toRow, toCol) {
        // 象/相不能过河，斜向移动两格，不能被蹩脚
        const isRed = this.board[fromRow][fromCol] === this.board[fromRow][fromCol].toUpperCase();
        
        if (isRed && toRow < 5) return false; // 红方象不能过河
        if (!isRed && toRow > 4) return false; // 黑方相不能过河
        
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        
        if (rowDiff !== 2 || colDiff !== 2) return false;
        
        // 检查蹩脚点
        const midRow = (fromRow + toRow) / 2;
        const midCol = (fromCol + toCol) / 2;
        
        return this.board[midRow][midCol] === null;
    }
    
    isValidKnightMove(fromRow, fromCol, toRow, toCol) {
        // 马走日字，不能被蹩脚
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        
        if (!((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2))) {
            return false;
        }
        
        // 检查蹩脚点
        let blockRow, blockCol;
        if (rowDiff === 2) {
            blockRow = fromRow + (toRow - fromRow) / 2;
            blockCol = fromCol;
        } else {
            blockRow = fromRow;
            blockCol = fromCol + (toCol - fromCol) / 2;
        }
        
        return this.board[blockRow][blockCol] === null;
    }
    
    isValidRookMove(fromRow, fromCol, toRow, toCol) {
        // 车直线移动，路径上不能有棋子
        if (fromRow !== toRow && fromCol !== toCol) return false;
        
        return this.isPathClear(fromRow, fromCol, toRow, toCol);
    }
    
    isValidCannonMove(fromRow, fromCol, toRow, toCol) {
        // 炮直线移动，吃子时需要隔一个棋子
        if (fromRow !== toRow && fromCol !== toCol) return false;
        
        const targetPiece = this.board[toRow][toCol];
        const pieceCount = this.countPiecesInPath(fromRow, fromCol, toRow, toCol);
        
        if (targetPiece === null) {
            return pieceCount === 0; // 移动时路径必须清空
        } else {
            return pieceCount === 1; // 吃子时必须隔一个棋子
        }
    }
    
    isValidPawnMove(fromRow, fromCol, toRow, toCol) {
        // 兵/卒的移动规则
        const isRed = this.board[fromRow][fromCol] === this.board[fromRow][fromCol].toUpperCase();
        const rowDiff = toRow - fromRow;
        const colDiff = Math.abs(toCol - fromCol);
        
        // 只能向前或横向移动一格
        if (Math.abs(rowDiff) + colDiff !== 1) return false;
        
        if (isRed) {
            // 红方兵
            if (fromRow >= 5) {
                // 过河前只能向前
                return rowDiff === -1 && colDiff === 0;
            } else {
                // 过河后可以横向移动
                return (rowDiff === -1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
            }
        } else {
            // 黑方卒
            if (fromRow <= 4) {
                // 过河前只能向前
                return rowDiff === 1 && colDiff === 0;
            } else {
                // 过河后可以横向移动
                return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
            }
        }
    }
    
    isPathClear(fromRow, fromCol, toRow, toCol) {
        return this.countPiecesInPath(fromRow, fromCol, toRow, toCol) === 0;
    }
    
    countPiecesInPath(fromRow, fromCol, toRow, toCol) {
        let count = 0;
        const rowStep = fromRow === toRow ? 0 : (toRow - fromRow) / Math.abs(toRow - fromRow);
        const colStep = fromCol === toCol ? 0 : (toCol - fromCol) / Math.abs(toCol - fromCol);
        
        let currentRow = fromRow + rowStep;
        let currentCol = fromCol + colStep;
        
        while (currentRow !== toRow || currentCol !== toCol) {
            if (this.board[currentRow][currentCol] !== null) {
                count++;
            }
            currentRow += rowStep;
            currentCol += colStep;
        }
        
        return count;
    }
    
    movePiece(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];
        
        // 如果吃掉了对方棋子，添加到被吃棋子列表
        if (capturedPiece) {
            const capturedSide = capturedPiece === capturedPiece.toUpperCase() ? 'red' : 'black';
            const capturingSide = capturedSide === 'red' ? 'black' : 'red';
            this.capturedPieces[capturingSide].push(capturedPiece);
            
            // 检查是否将军
            if (capturedPiece.toLowerCase() === 'k') {
                this.gameStatus = 'checkmate';
                this.showGameEndMessage(`${capturingSide === 'red' ? '红方' : '黑方'}获胜！`);
            }
        }
        
        // 移动棋子
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        // 检查是否将军
        this.checkForCheck();
        
        // 如果是联机模式，发送移动信息
        if (this.isOnline && this.socket) {
            this.socket.emit('move', {
                roomId: this.roomId,
                from: { row: fromRow, col: fromCol },
                to: { row: toRow, col: toCol },
                board: this.board
            });
        }
    }
    
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
    }
    
    drawBoard() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.boardWidth, this.boardHeight);
        
        // 绘制棋盘线条
        this.drawBoardLines();
        
        // 绘制九宫格
        this.drawPalace();
        
        // 绘制棋子
        this.drawPieces();
        
        // 绘制选中的棋子高亮
        if (this.selectedPiece) {
            this.drawSelection(this.selectedPiece.row, this.selectedPiece.col);
        }
    }
    
    drawBoardLines() {
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        
        // 绘制横线
        for (let i = 0; i <= 9; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.startX, this.startY + i * this.cellSize);
            this.ctx.lineTo(this.startX + 8 * this.cellSize, this.startY + i * this.cellSize);
            this.ctx.stroke();
        }
        
        // 绘制竖线
        for (let i = 0; i <= 8; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.startX + i * this.cellSize, this.startY);
            if (i === 0 || i === 8) {
                // 边线贯通
                this.ctx.lineTo(this.startX + i * this.cellSize, this.startY + 9 * this.cellSize);
            } else {
                // 中间线分段
                this.ctx.lineTo(this.startX + i * this.cellSize, this.startY + 4 * this.cellSize);
                this.ctx.moveTo(this.startX + i * this.cellSize, this.startY + 5 * this.cellSize);
                this.ctx.lineTo(this.startX + i * this.cellSize, this.startY + 9 * this.cellSize);
            }
            this.ctx.stroke();
        }
    }
    
    drawPalace() {
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        
        // 黑方九宫格
        this.ctx.beginPath();
        this.ctx.moveTo(this.startX + 3 * this.cellSize, this.startY);
        this.ctx.lineTo(this.startX + 5 * this.cellSize, this.startY + 2 * this.cellSize);
        this.ctx.moveTo(this.startX + 5 * this.cellSize, this.startY);
        this.ctx.lineTo(this.startX + 3 * this.cellSize, this.startY + 2 * this.cellSize);
        this.ctx.stroke();
        
        // 红方九宫格
        this.ctx.beginPath();
        this.ctx.moveTo(this.startX + 3 * this.cellSize, this.startY + 7 * this.cellSize);
        this.ctx.lineTo(this.startX + 5 * this.cellSize, this.startY + 9 * this.cellSize);
        this.ctx.moveTo(this.startX + 5 * this.cellSize, this.startY + 7 * this.cellSize);
        this.ctx.lineTo(this.startX + 3 * this.cellSize, this.startY + 9 * this.cellSize);
        this.ctx.stroke();
    }
    
    drawPieces() {
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 9; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    this.drawPiece(row, col, piece);
                }
            }
        }
    }
    
    drawPiece(row, col, piece) {
        const x = this.startX + col * this.cellSize;
        const y = this.startY + row * this.cellSize;
        const radius = 25;
        
        // 绘制棋子圆形背景
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        
        if (piece === piece.toUpperCase()) {
            // 红方棋子
            this.ctx.fillStyle = '#ff4444';
        } else {
            // 黑方棋子
            this.ctx.fillStyle = '#333333';
        }
        
        this.ctx.fill();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // 绘制棋子文字
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(this.pieceNames[piece], x, y);
    }
    
    drawSelection(row, col) {
        const x = this.startX + col * this.cellSize;
        const y = this.startY + row * this.cellSize;
        
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 30, 0, 2 * Math.PI);
        this.ctx.stroke();
    }
    
    updateUI() {
        document.getElementById('current-player').textContent = this.currentPlayer === 'red' ? '红方' : '黑方';
        
        let status = '游戏进行中';
        if (this.gameStatus === 'checkmate') {
            status = `${this.currentPlayer === 'red' ? '黑方' : '红方'}获胜！`;
        } else if (this.isInCheck) {
            status = `${this.currentPlayer === 'red' ? '红方' : '黑方'}被将军！对方快输了！`;
        }
        
        if (this.isOnline) {
            status += ` (联机模式 - ${this.playerSide === 'red' ? '红方' : '黑方'})`;
        }
        
        document.getElementById('game-status').textContent = status;
        
        // 更新被吃棋子显示
        this.updateCapturedPieces();
        
        // 更新联机按钮状态
        this.updateOnlineUI();
    }
    
    updateCapturedPieces() {
        const redCaptured = document.getElementById('red-captured-pieces');
        const blackCaptured = document.getElementById('black-captured-pieces');
        
        redCaptured.innerHTML = '';
        blackCaptured.innerHTML = '';
        
        this.capturedPieces.red.forEach(piece => {
            const pieceElement = document.createElement('div');
            pieceElement.className = 'captured-piece red';
            pieceElement.textContent = this.pieceNames[piece];
            redCaptured.appendChild(pieceElement);
        });
        
        this.capturedPieces.black.forEach(piece => {
            const pieceElement = document.createElement('div');
            pieceElement.className = 'captured-piece black';
            pieceElement.textContent = this.pieceNames[piece];
            blackCaptured.appendChild(pieceElement);
        });
    }
    
    resetGame() {
        this.currentPlayer = 'red';
        this.selectedPiece = null;
        this.gameStatus = 'playing';
        this.isInCheck = false;
        this.capturedPieces = { red: [], black: [] };
        this.initBoard();
        this.drawBoard();
        this.updateUI();
        
        // 如果是联机模式，通知对方重置游戏
        if (this.isOnline && this.socket) {
            this.socket.emit('reset', { roomId: this.roomId });
        }
    }
    
    // 检查是否将军
    checkForCheck() {
        const opponentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
        const kingPosition = this.findKing(opponentPlayer);
        
        if (!kingPosition) return;
        
        this.isInCheck = this.isPositionUnderAttack(kingPosition.row, kingPosition.col, this.currentPlayer);
        
        if (this.isInCheck) {
            this.showCheckMessage(`${opponentPlayer === 'red' ? '红方' : '黑方'}被将军！`);
        }
    }
    
    // 找到指定方的将/帅
    findKing(player) {
        const kingPiece = player === 'red' ? 'K' : 'k';
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.board[row][col] === kingPiece) {
                    return { row, col };
                }
            }
        }
        return null;
    }
    
    // 检查位置是否被攻击
    isPositionUnderAttack(targetRow, targetCol, attackingPlayer) {
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 9; col++) {
                const piece = this.board[row][col];
                if (piece && this.isPieceOwnedByPlayer(piece, attackingPlayer)) {
                    if (this.isValidMove(row, col, targetRow, targetCol)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    // 检查棋子是否属于指定玩家
    isPieceOwnedByPlayer(piece, player) {
        if (player === 'red') {
            return piece === piece.toUpperCase();
        } else {
            return piece === piece.toLowerCase();
        }
    }
    
    // 显示将军提示
    showCheckMessage(message) {
        const checkAlert = document.createElement('div');
        checkAlert.className = 'check-alert';
        checkAlert.textContent = message;
        document.body.appendChild(checkAlert);
        
        setTimeout(() => {
            if (checkAlert.parentNode) {
                checkAlert.parentNode.removeChild(checkAlert);
            }
        }, 3000);
    }
    
    // 显示游戏结束消息
    showGameEndMessage(message) {
        const endAlert = document.createElement('div');
        endAlert.className = 'game-end-alert';
        endAlert.innerHTML = `
            <div class="alert-content">
                <h2>${message}</h2>
                <button onclick="location.reload()">重新开始</button>
            </div>
        `;
        document.body.appendChild(endAlert);
    }
    
    // 初始化联机功能
    initOnlineFeatures() {
        // 这里可以初始化Socket.IO连接
        // 由于这是演示版本，我们使用模拟的联机功能
        console.log('联机功能已初始化');
    }
    
    // 切换联机模式
    toggleOnlineMode() {
        this.isOnline = !this.isOnline;
        if (this.isOnline) {
            this.connectToServer();
        } else {
            this.disconnectFromServer();
        }
        this.updateUI();
    }
    
    // 连接到服务器
    connectToServer() {
        // 模拟连接到服务器
        console.log('正在连接到服务器...');
        setTimeout(() => {
            console.log('已连接到服务器');
            this.showMessage('已连接到服务器，可以创建或加入房间');
        }, 1000);
    }
    
    // 断开服务器连接
    disconnectFromServer() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.roomId = null;
        this.playerSide = null;
        console.log('已断开服务器连接');
    }
    
    // 创建房间
    createRoom() {
        if (!this.isOnline) {
            this.showMessage('请先开启联机模式');
            return;
        }
        
        this.roomId = 'room_' + Math.random().toString(36).substr(2, 9);
        this.playerSide = 'red';
        this.showMessage(`房间已创建：${this.roomId}\n等待对手加入...`);
        console.log(`创建房间：${this.roomId}`);
    }
    
    // 加入房间
    joinRoom() {
        if (!this.isOnline) {
            this.showMessage('请先开启联机模式');
            return;
        }
        
        const roomId = prompt('请输入房间号：');
        if (roomId) {
            this.roomId = roomId;
            this.playerSide = 'black';
            this.showMessage(`已加入房间：${roomId}`);
            console.log(`加入房间：${roomId}`);
        }
    }
    
    // 更新联机UI
    updateOnlineUI() {
        const onlineBtn = document.getElementById('online-btn');
        const createBtn = document.getElementById('create-room-btn');
        const joinBtn = document.getElementById('join-room-btn');
        
        if (onlineBtn) {
            onlineBtn.textContent = this.isOnline ? '关闭联机' : '开启联机';
            onlineBtn.className = this.isOnline ? 'btn online-active' : 'btn';
        }
        
        if (createBtn && joinBtn) {
            createBtn.style.display = this.isOnline ? 'inline-block' : 'none';
            joinBtn.style.display = this.isOnline ? 'inline-block' : 'none';
        }
    }
    
    // 显示消息
    showMessage(message) {
        const messageAlert = document.createElement('div');
        messageAlert.className = 'message-alert';
        messageAlert.textContent = message;
        document.body.appendChild(messageAlert);
        
        setTimeout(() => {
            if (messageAlert.parentNode) {
                messageAlert.parentNode.removeChild(messageAlert);
            }
        }, 4000);
    }
}

// 游戏初始化
window.addEventListener('DOMContentLoaded', () => {
    new ChineseChess();
});