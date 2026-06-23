// SAO CHÉP CHÍNH XÁC CẤU HÌNH FIREBASE TỪ SCRIPT CŨ CỦA BẠN
const firebaseConfig = {
    apiKey: "AIzaSyAOSKLNPXp-s40iJNYYzdEWDnQDFoa6x_Q",
    authDomain: "thue2026-f558d.firebaseapp.com",
    databaseURL: "https://thue2026-f558d-default-rtdb.firebaseio.com",
    projectId: "thue2026-f558d",
    storageBucket: "thue2026-f558d.firebasestorage.app",
    messagingSenderId: "1008017359572",
    appId: "1:1008017359572:web:f70cf40778e600e8deb141"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// KIỂM TRA TRẠNG THÁI LOGIN KHI LOAD TRANG
window.onload = function() {
    checkAdminAuth();
};

function checkAdminAuth() {
    const isAdminLoggedIn = sessionStorage.getItem('isAdminLoggedIn');
    if (isAdminLoggedIn === 'true') {
        document.getElementById('adminLoginWrapper').classList.add('hidden');
        document.getElementById('adminMainSection').classList.remove('hidden');
    } else {
        document.getElementById('adminLoginWrapper').classList.remove('hidden');
        document.getElementById('adminMainSection').classList.add('hidden');
    }
}

// LOGIN ADMIN: SET CỨNG THÔNG TIN ĐIỀU KIỆN THEO YÊU CẦU
function loginAdmin() {
    const userInp = document.getElementById('adminUser').value.trim();
    const passInp = document.getElementById('adminPass').value.trim();

    if (userInp === "admin" && passInp === "nhnoqt@123") {
        sessionStorage.setItem('isAdminLoggedIn', 'true');
        checkAdminAuth();
    } else {
        alert("Sai tài khoản hoặc mật khẩu Admin! Vui lòng kiểm tra lại.");
    }
}

function logoutAdmin() {
    sessionStorage.removeItem('isAdminLoggedIn');
    location.reload();
}

// CHỨC NĂNG CẤP MỚI HOẶC ĐỔI THÔNG TIN / ĐỔI MẬT KHẨU USER
function saveUser() {
    const nodeId = document.getElementById('uNodeId').value.trim(); // ví dụ: dha, hvl
    const username = document.getElementById('uUsername').value.trim(); // ví dụ: Đông Hà
    const password = document.getElementById('uPassword').value.trim(); // mật khẩu mới
    const branch = document.getElementById('uBranch').value.trim(); // mã địa bàn

    if (!nodeId || !username || !password || !branch) {
        alert("Vui lòng nhập đầy đủ tất cả các trường dữ liệu!");
        return;
    }

    // Cấu trúc dữ liệu ghi đè/tạo mới khớp chuẩn 100% hình ảnh cấu trúc bạn cung cấp
    const userData = {
        Branch: branch,
        password: password,
        username: username
    };

    db.ref('users/' + nodeId).set(userData).then(() => {
        alert("Đã lưu/cập nhật thông tin User '" + nodeId + "' thành công!");
        // Làm sạch form
        document.getElementById('uNodeId').value = "";
        document.getElementById('uUsername').value = "";
        document.getElementById('uPassword').value = "";
        document.getElementById('uBranch').value = "";
    }).catch(err => {
        alert("Lỗi kết nối Firebase: " + err.message);
    });
}

// CHỨC NĂNG XÓA USER KHỎI HỆ THỐNG
function deleteUser() {
    const nodeId = document.getElementById('uNodeId').value.trim();
    if (!nodeId) {
        alert("Vui lòng điền 'Tài khoản (ID)' bạn muốn xóa!");
        return;
    }

    if (confirm("Bạn có chắc chắn muốn XÓA VĨNH VIỄN user '" + nodeId + "' không?")) {
        db.ref('users/' + nodeId).remove().then(() => {
            alert("Đã xóa user thành công!");
            document.getElementById('uNodeId').value = "";
        }).catch(err => alert("Lỗi khi xóa: " + err.message));
    }
}

// BỘ GIẢ LẬP ĐỌC LỆNH SQL SERVER SANG CƠ SỞ DỮ LIỆU NO-SQL (FIREBASE)
function executeSqlQuery() {
    const sqlText = document.getElementById('sqlQueryInput').value.trim();
    const resultContainer = document.getElementById('sqlResultsWrapper');
    
    if (!sqlText) {
        alert("Vui lòng nhập lệnh truy vấn!");
        return;
    }

    // Biến đổi chuỗi viết thường để bóc tách thông tin
    const cleanSql = sqlText.toLowerCase().replace(/\s+/g, ' ');

    if (!cleanSql.startsWith("select * from")) {
        alert("Trình giả lập hiện tại chỉ hỗ trợ cú pháp: SELECT * FROM [Tên_Bảng]");
        return;
    }

    // Trích xuất tên bảng (node trong Firebase)
    const tableParts = sqlText.split(/from/i);
    if(tableParts.length < 2) {
        alert("Lệnh SQL không đúng định dạng!");
        return;
    }
    const tableName = tableParts[1].trim(); // Bảng mong muốn: users hoặc QRCodeTax

    resultContainer.innerHTML = "<p class='placeholder-text' style='color:#38bdf8;'>Đang thực thi lệnh và kết nối database...</p>";

    // Truy vấn dữ liệu một lần từ Firebase tương ứng với tên node bảng
    db.ref(tableName).once('value').then((snapshot) => {
        const data = snapshot.val();
        if (!data) {
            resultContainer.innerHTML = "<p class='placeholder-text'>Bảng không tồn tại hoặc rỗng.</p>";
            return;
        }

        // Chuyển đổi dữ liệu JSON từ Firebase sang mảng đối tượng hiển thị
        let recordsArray = [];
        if (Array.isArray(data)) {
            recordsArray = data.filter(Boolean);
        } else {
            for (let id in data) {
                let item = data[id];
                if (typeof item === 'object' && item !== null) {
                    if (!item.ID) item.ID = id; // Gắn ID nếu là bản ghi dạng key-object
                    recordsArray.push(item);
                }
            }
        }

        if (recordsArray.length === 0) {
            resultContainer.innerHTML = "<p class='placeholder-text'>Không có bản ghi nào.</p>";
            return;
        }

        // Tạo tiêu đề cột động dựa trên các Key dữ liệu có trong bản ghi
        let keys = new Set();
        recordsArray.forEach(rec => Object.keys(rec).forEach(k => keys.add(k)));
        let columns = Array.from(keys);

        // Sinh bảng HTML
        let htmlTable = "<table><thead><tr>";
        columns.forEach(col => {
            htmlTable += "<th>" + col + "</th>";
        });
        htmlTable += "</tr></thead><tbody>";

        recordsArray.forEach(rec => {
            htmlTable += "<tr>";
            columns.forEach(col => {
                let val = rec[col];
                if (val === undefined || val === null) val = "";
                if (typeof val === 'object') val = JSON.stringify(val);
                htmlTable += "<td>" + val + "</td>";
            });
            htmlTable += "</tr>";
        });
        htmlTable += "</tbody></table>";

        resultContainer.innerHTML = htmlTable;

    }).catch(err => {
        resultContainer.innerHTML = "<p class='placeholder-text' style='color:#ef4444;'>Lỗi thực thi: " + err.message + "</p>";
    });
}