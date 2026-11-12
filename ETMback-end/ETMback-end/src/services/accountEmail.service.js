const roles = {
  ClubManager: "Quản lý câu lạc bộ",
  TournamentOrganizer: "Ban tổ chức giải đấu",
};

export function accountEmail(user, type, token) {
  const messages = {
    activation: {
      subject: "[ETM] Thư mời kích hoạt tài khoản nhân sự",
      introduction: `Ban quản trị Esports Tournament Management (ETM) đã tạo tài khoản dành cho bạn với vai trò ${roles[user.systemRole] || "Nhân sự"}.`,
      instruction: "Vui lòng truy cập liên kết bên dưới để kích hoạt tài khoản và thiết lập mật khẩu đăng nhập:",
      path: "/activate",
      validity: "48 giờ",
      help: "Nếu bạn chưa được thông báo về việc cấp tài khoản này, vui lòng liên hệ người quản trị đã mời bạn để được hỗ trợ.",
    },
    verification: {
      subject: "[ETM] Xác nhận địa chỉ email đăng ký tài khoản",
      introduction: "Cảm ơn bạn đã đăng ký tài khoản tại Esports Tournament Management (ETM).",
      instruction: "Vui lòng truy cập liên kết bên dưới để xác nhận địa chỉ email và hoàn tất đăng ký:",
      path: "/verify-email",
      validity: "24 giờ",
      help: "Nếu bạn không đăng ký tài khoản này, bạn có thể bỏ qua email. Tài khoản sẽ chưa được kích hoạt khi địa chỉ email chưa được xác nhận.",
    },
    reset: {
      subject: "[ETM] Hướng dẫn đặt lại mật khẩu",
      introduction: "Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại Esports Tournament Management (ETM).",
      instruction: "Để thiết lập mật khẩu mới, vui lòng truy cập liên kết bên dưới:",
      path: "/reset-password",
      validity: "60 phút",
      help: "Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email. Mật khẩu hiện tại của bạn sẽ không thay đổi.",
    },
  };
  const message = messages[type];
  if (!message) throw new Error("Unsupported account email type");
  const link = `${process.env.CLIENT_URL.replace(/\/$/, "")}${message.path}?token=${encodeURIComponent(token)}`;
  return {
    to: user.email,
    subject: message.subject,
    text: [
      `Xin chào ${String(user.fullName || "bạn").trim()},`,
      message.introduction,
      `Email tài khoản: ${user.email}`,
      message.instruction,
      link,
      `Liên kết có hiệu lực trong ${message.validity} kể từ thời điểm phát hành và chỉ sử dụng được một lần. Vui lòng không chia sẻ liên kết này với người khác.`,
      message.help,
      "Trân trọng,\nĐội ngũ Esports Tournament Management (ETM)",
    ].join("\n\n"),
  };
}
