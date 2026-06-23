// CẤU HÌNH HỆ THỐNG FIREBASE REALTIME DATABASE
const firebaseConfig = {
    apiKey: "AIzaSyAOSKLNPXp-s40iJNYYzdEWDnQDFoa6x_Q",
    authDomain: "thue2026-f558d.firebaseapp.com",
    databaseURL: "https://thue2026-f558d-default-rtdb.firebaseio.com",
    projectId: "thue2026-f558d",
    storageBucket: "thue2026-f558d.firebasestorage.app",
    messagingSenderId: "1008017359572",
    appId: "1:1008017359572:web:f70cf40778e600e8deb141"
};

// Khởi tạo kiểm tra an toàn tránh trùng lặp ứng dụng Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// KIỂM TRA ĐĂNG NHẬP NGAY KHI TRANG SẴN SÀNG
document.addEventListener("DOMContentLoaded", function() {
    checkAdminAuth();
});

function checkAdminAuth() {
    const loginBox = document.getElementById('adminLoginWrapper');
    const mainSection = document.getElementById('adminMainSection');
    const isAdminLoggedIn = sessionStorage.getItem('isAdminLoggedIn');

    if (isAdminLoggedIn === 'true') {
        if(loginBox) loginBox.style.display = "none";
        if(mainSection) mainSection.style.display = "block";
    } else {
        if(loginBox) loginBox.style.display = "flex";
        if(mainSection) mainSection.style.display = "none";
    }
}

// XỬ LÝ ĐĂNG NHẬP ADMIN THEO YÊU CẦU ĐẶC BIỆT
function loginAdmin() {
    const userInp = document.getElementById('adminUser').value.trim();
    const passInp = document.getElementById('adminPass').value.trim();

    // Tài khoản: admin | Mật khẩu: nhnoqt@123 | Quyền: 0000
    if (userInp === "admin" && passInp === "nhnoqt@123") {
        sessionStorage.setItem('isAdminLoggedIn', 'true');
        checkAdminAuth();
    } else {
        alert("Sai tài khoản hoặc mật khẩu hệ thống Admin!");
    }
}

function logoutAdmin() {
    sessionStorage.removeItem('isAdminLoggedIn');
    location.reload();
}

// THAO TÁC CẤP MỚI / ĐỔI MẬT KHẨU USER TRONG CƠ SỞ DỮ LIỆU
function saveUser() {
    const nodeId = document.getElementById('uNodeId').value.trim();
    const username = document.getElementById('uUsername').value.trim();
    const password = document.getElementById('uPassword').value.trim();
    const branch = document.getElementById('uBranch').value.trim();

    if (!nodeId || !username || !password || !branch) {
        alert("Vui lòng điền đầy đủ thông tin!");
        return;
    }

    const userData = {
        Branch: branch,
        password: password,
        username: username
    };

    db.ref('users/' + nodeId).set(userData).then(() => {
        alert("Cập nhật dữ liệu tài khoản '" + nodeId + "' thành công!");
        document.getElementById('uNodeId').value = "";
        document.getElementById('uUsername').value = "";
        document.getElementById('uPassword').value = "";
        document.getElementById('uBranch').value = "";
    }).catch(err => alert("Lỗi ghi Firebase: " + err.message));
}

function deleteUser() {
    const nodeId = document.getElementById('uNodeId').value.trim();
    if (!nodeId) {
        alert("Vui lòng nhập Tài khoản (ID) cần xóa!");
        return;
    }

    if (confirm("Xóa vĩnh viễn tài khoản '" + nodeId + "'?")) {
        db.ref('users/' + nodeId).remove().then(() => {
            alert("Đã xóa tài khoản.");
            document.getElementById('uNodeId').value = "";
        }).catch(err => alert("Lỗi: " + err.message));
    }
}

// TRÌNH TRUY VẤN SQL BẤT KỲ DÙNG THƯ VIỆN ALASQL TRÊN TRÌNH DUYỆT
function executeSqlQuery() {
    const sqlText = document.getElementById('sqlQueryInput').value.trim();
    const resultContainer = document.getElementById('sqlResultsWrapper');
    
    if (!sqlText) {
        alert("Hãy nhập lệnh SQL!");
        return;
    }

    const match = sqlText.match(/from\s+([a-zA-Z0-9_]+)/i);
    if (!match) {
        alert("Lệnh SQL cần có từ khóa FROM [Tên_Bảng]. Ví dụ: SELECT * FROM QRCodeTax");
        return;
    }
    const firebaseNodeName = match[1];

    resultContainer.innerHTML = "<p class='placeholder-text' style='color:#38bdf8;'>Đang tải dữ liệu và biên dịch SQL...</p>";

    db.ref(firebaseNodeName).once('value').then((snapshot) => {
        const rawData = snapshot.val();
        if (!rawData) {
            resultContainer.innerHTML = "<p class='placeholder-text'>Không tìm thấy dữ liệu tại bảng '" + firebaseNodeName + "'.</p>";
            return;
        }

        let dataArray = [];
        for (let id in rawData) {
            let item = rawData[id];
            if (typeof item === 'object' && item !== null) {
                if (!item.id_key) item.id_key = id;
                dataArray.push(item);
            }
        }

        try {
            let sqlToRun = sqlText.replace(new RegExp("from\\s+" + firebaseNodeName, "i"), "FROM ?");
            let queryResults = alasql(sqlToRun, [dataArray]);

            if (!queryResults || queryResults.length === 0) {
                resultContainer.innerHTML = "<p class='placeholder-text'>Lệnh chạy thành công nhưng dữ liệu trả về rỗng.</p>";
                return;
            }

            let columns = Object.keys(queryResults[0]);
            let htmlTable = "<table><thead><tr>";
            columns.forEach(col => { htmlTable += "<th>" + col + "</th>"; });
            htmlTable += "</tr></thead><tbody>";

            queryResults.forEach(row => {
                htmlTable += "<tr>";
                columns.forEach(col => {
                    let val = row[col];
                    if (val === undefined || val === null) val = "";
                    if (typeof val === 'object') val = JSON.stringify(val);
                    if (typeof val === 'number' && (col.toLowerCase().includes('tien') || col.toLowerCase().includes('total'))) {
                        val = val.toLocaleString('vi-VN') + " đ";
                    }
                    htmlTable += "<td>" + val + "</td>";
                });
                htmlTable += "</tr>";
            });
            htmlTable += "</tbody></table>";

            resultContainer.innerHTML = "<p style='color:#10b981; font-weight:bold; margin-bottom:10px;'>📊 Kết quả: " + queryResults.length + " dòng dữ liệu.</p>" + htmlTable;

        } catch (sqlError) {
            resultContainer.innerHTML = "<p class='placeholder-text' style='color:#ef4444;'>❌ Lỗi cú pháp SQL: " + sqlError.message + "</p>";
        }
    }).catch(err => {
        resultContainer.innerHTML = "<p class='placeholder-text' style='color:#ef4444;'>❌ Lỗi kết nối Firebase: " + err.message + "</p>";
    });
}
