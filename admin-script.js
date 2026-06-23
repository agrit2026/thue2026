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
// HÀM XỬ LÝ TRUY VẤN SQL BẤT KỲ (HỖ TRỢ ĐẦY ĐỦ SELECT, WHERE, GROUP BY, SUM, COUNT...)
function executeSqlQuery() {
    const sqlText = document.getElementById('sqlQueryInput').value.trim();
    const resultContainer = document.getElementById('sqlResultsWrapper');
    
    if (!sqlText) {
        alert("Vui lòng nhập lệnh truy vấn SQL!");
        return;
    }

    // 1. Phân tích lệnh để tìm xem admin đang muốn lấy dữ liệu từ bảng (node) nào trên Firebase
    // Ví dụ: "SELECT * FROM QRCodeTax WHERE ..." -> Lấy ra chữ "QRCodeTax"
    const match = sqlText.match(/from\s+([a-zA-Z0-9_]+)/i);
    if (!match) {
        alert("Không tìm thấy tên bảng hợp lệ sau từ khóa 'FROM'. Ví dụ chuẩn: SELECT * FROM QRCodeTax");
        return;
    }
    const firebaseNodeName = match[1]; // Tên node trên Firebase (users hoặc QRCodeTax)

    resultContainer.innerHTML = "<p class='placeholder-text' style='color:#38bdf8;'>Đang tải dữ liệu từ Firebase và thực thi SQL...</p>";

    // 2. Đọc toàn bộ dữ liệu gốc từ Firebase về
    db.ref(firebaseNodeName).once('value').then((snapshot) => {
        const rawData = snapshot.val();
        if (!rawData) {
            resultContainer.innerHTML = "<p class='placeholder-text'>Bảng '" + firebaseNodeName + "' không tồn tại hoặc không có dữ liệu.</p>";
            return;
        }

        // Chuyển đổi cấu trúc Firebase (Object) thành một mảng phẳng (Array) để nạp vào công cụ chạy SQL
        let dataArray = [];
        for (let id in rawData) {
            let item = rawData[id];
            if (typeof item === 'object' && item !== null) {
                if (!item.id_key) item.id_key = id; // Gắn thêm khóa ID gốc nếu cần
                dataArray.push(item);
            }
        }

        try {
            // 3. SỬ DỤNG ALASQL ĐỂ CHẠY CÂU LỆNH SQL BẤT KỲ TRÊN MẢNG DỮ LIỆU VỪA TẢI VỀ
            // Biến tên bảng trong câu lệnh SQL thành mảng dữ liệu dataArray
            let sqlToRun = sqlText.replace(new RegExp("from\\s+" + firebaseNodeName, "i"), "FROM ?");
            
            // Thực thi câu lệnh SQL
            let queryResults = alasql(sqlToRun, [dataArray]);

            if (!queryResults || queryResults.length === 0) {
                resultContainer.innerHTML = "<p class='placeholder-text'>Lệnh thực thi thành công nhưng không trả về dòng dữ liệu nào phù hợp.</p>";
                return;
            }

            // 4. HIỂN THỊ KẾT QUẢ RA BẢNG HTML (Tự động nhận diện cột dựa theo kết quả câu lệnh SQL)
            let columns = Object.keys(queryResults[0]);
            
            let htmlTable = "<table><thead><tr>";
            columns.forEach(col => {
                htmlTable += "<th>" + col + "</th>";
            });
            htmlTable += "</tr></thead><tbody>";

            queryResults.forEach(row => {
                htmlTable += "<tr>";
                columns.forEach(col => {
                    let val = row[col];
                    if (val === undefined || val === null) val = "";
                    if (typeof val === 'object') val = JSON.stringify(val);
                    // Định dạng số tiền nếu là các cột số tiền để dễ nhìn báo cáo
                    if (typeof val === 'number' && (col.toLowerCase().includes('tien') || col.toLowerCase().includes('total'))) {
                        val = val.toLocaleString('vi-VN') + " đ";
                    }
                    htmlTable += "<td>" + val + "</td>";
                });
                htmlTable += "</tr>";
            });
            htmlTable += "</tbody></table>";

            // Hiển thị số lượng dòng kết quả lên phía trên bảng
            resultContainer.innerHTML = "<p style='color:#10b981; font-weight:bold; margin-bottom:10px;'>📊 Tìm thấy " + queryResults.length + " dòng kết quả:</p>" + htmlTable;

        } catch (sqlError) {
            resultContainer.innerHTML = "<p class='placeholder-text' style='color:#ef4444;'>❌ Lỗi cú pháp SQL Server: " + sqlError.message + "</p>";
        }

    }).catch(err => {
        resultContainer.innerHTML = "<p class='placeholder-text' style='color:#ef4444;'>❌ Lỗi kết nối Firebase: " + err.message + "</p>";
    });
}
