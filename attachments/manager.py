import sys
import os
import re
import html
import json
import zipfile
import sqlite3
import secrets
import hashlib
import xml.etree.ElementTree as ET
from datetime import datetime
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QLineEdit, QTreeWidget, QTreeWidgetItem, QHeaderView,
    QMenu, QDialog, QLabel, QTextEdit, QMessageBox, QFileDialog,
    QAbstractItemView, QFrame, QInputDialog, QComboBox, QColorDialog,
    QTableWidget, QTableWidgetItem
)
from PyQt6.QtCore import Qt, pyqtSignal, QLoggingCategory, QTimer, QObject, QSettings, QUrl
from PyQt6.QtGui import (
    QColor, QFont, QTextCharFormat, QTextFormat, QTextDocument, QTextCursor,
    QIcon, QPixmap, QPainter, QBrush, QKeySequence, QShortcut, QDesktopServices
)

# ----------------- 图标加载助手（带内存单例缓存） -----------------
_CACHED_ICON = None

def get_app_icon() -> QIcon:
    """获取程序图标：优先查找本地 document.ico，若不存在则使用矢量生成的高清图标"""
    global _CACHED_ICON
    if _CACHED_ICON is not None:
        return _CACHED_ICON

    possible_paths = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "document.ico"),
        os.path.join(os.getcwd(), "document.ico")
    ]
    for p in possible_paths:
        if os.path.exists(p):
            _CACHED_ICON = QIcon(p)
            return _CACHED_ICON

    pixmap = QPixmap(64, 64)
    pixmap.fill(Qt.GlobalColor.transparent)
    painter = QPainter(pixmap)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)

    painter.setBrush(QBrush(QColor("#2563eb")))
    painter.setPen(Qt.PenStyle.NoPen)
    painter.drawRoundedRect(8, 6, 48, 52, 6, 6)

    painter.setBrush(QBrush(QColor("#ffffff")))
    painter.drawRoundedRect(16, 16, 24, 4, 2, 2)
    painter.drawRoundedRect(16, 26, 32, 4, 2, 2)
    painter.drawRoundedRect(16, 36, 20, 4, 2, 2)

    painter.setBrush(QBrush(QColor("#facc15")))
    painter.drawEllipse(34, 38, 14, 14)
    painter.end()

    _CACHED_ICON = QIcon(pixmap)
    return _CACHED_ICON


# ==================== 专业多主题配色系统 ====================
THEMES = {
    "深色 (暗夜极客)": {
        "normal_color": QColor("#ffffff"),
        "folder_color": QColor("#7aa2f7"),
        "sub_color": QColor("#a9b1d6"),
        "preview_color": QColor("#787c99"),
        "qss": """
            QMainWindow, QDialog { background-color: #1a1b26; color: #e0e0e0; font-family: 'Microsoft YaHei', sans-serif; font-size: 13px; }
            QLabel { color: #c0caf5; }
            QPushButton { background-color: #24283b; color: #c0caf5; border: 1px solid #3b4261; border-radius: 6px; padding: 5px 12px; font-weight: 500; }
            QPushButton:hover { background-color: #3b4261; border-color: #7aa2f7; color: #ffffff; }
            QPushButton:disabled { background-color: #1c1d28; color: #545c7e; border-color: #2a2e45; }
            QPushButton:checked { background-color: #7aa2f7; color: #15161e; font-weight: bold; }
            QPushButton#primaryBtn { background-color: #7aa2f7; color: #15161e; border: none; font-weight: bold; }
            QPushButton#primaryBtn:hover { background-color: #89b4fa; }
            QPushButton#primaryBtn:disabled { background-color: #2c3a5e; color: #5c6b8c; }
            QPushButton#folderBtn { background-color: #24283b; color: #e0af68; border: 1px solid #e0af68; font-weight: bold; }
            QPushButton#folderBtn:hover { background-color: #e0af68; color: #15161e; }
            QPushButton#dangerBtn { background-color: #f7768e; color: #15161e; border: none; font-weight: bold; }
            QPushButton#dangerBtn:hover { background-color: #ff9eaf; }
            QPushButton#zoomBtn { background: transparent; border: none; color: #a9b1d6; font-size: 14px; font-weight: bold; padding: 0 4px; min-width: 18px; }
            QPushButton#zoomBtn:hover { background-color: #3b4261; border-radius: 3px; color: #ffffff; }
            
            QLineEdit, QComboBox { background-color: #16161e; color: #ffffff; border: 1px solid #2f334d; border-radius: 6px; padding: 5px; }
            QTextEdit { background-color: #16161e; color: #ffffff; border: 1px solid #2f334d; border-radius: 6px; padding: 10px 14px; }
            QLineEdit:focus, QTextEdit:focus, QComboBox:focus { border: 1px solid #7aa2f7; }
            QComboBox QAbstractItemView { background-color: #1a1b26; color: #ffffff; selection-background-color: #364a82; border: 1px solid #2f334d; }
            
            QScrollBar:vertical { background-color: #16161e; width: 8px; margin: 0px; border-radius: 4px; }
            QScrollBar::handle:vertical { background-color: #3b4261; min-height: 28px; border-radius: 4px; }
            QScrollBar::handle:vertical:hover { background-color: #545c7e; }
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0px; background: none; }
            QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical { background: none; }
            QScrollBar:horizontal { background-color: #16161e; height: 8px; margin: 0px; border-radius: 4px; }
            QScrollBar::handle:horizontal { background-color: #3b4261; min-width: 28px; border-radius: 4px; }
            QScrollBar::handle:horizontal:hover { background-color: #545c7e; }
            QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal { width: 0px; background: none; }
            QScrollBar::add-page:horizontal, QScrollBar::sub-page:horizontal { background: none; }

            QTreeWidget, QTableWidget { background-color: #16161e; color: #ffffff; border: 1px solid #2f334d; border-radius: 6px; outline: none; }
            QTreeWidget::item, QTableWidget::item { padding: 7px 4px; border-bottom: 1px solid #24283b; }
            QTreeWidget::item:selected, QTableWidget::item:selected { background-color: #2e5b88; color: #ffffff; }
            QTreeWidget::drop-indicator { background-color: #7aa2f7; height: 2px; }
            QHeaderView::section { background-color: #1f2335; color: #7aa2f7; padding: 6px 8px; border: none; border-right: 1px solid #24283b; border-bottom: 1px solid #24283b; font-weight: bold; }
            
            QMenu { background-color: #1f2335; color: #c0caf5; border: 1px solid #3b4261; border-radius: 6px; padding: 4px; }
            QMenu::item:selected { background-color: #7aa2f7; color: #15161e; }
        """
    },
    "浅色 (简约素雅)": {
        "normal_color": QColor("#1e293b"),
        "folder_color": QColor("#2563eb"),
        "sub_color": QColor("#64748b"),
        "preview_color": QColor("#475569"),
        "qss": """
            QMainWindow, QDialog { background-color: #f8fafc; color: #1e293b; font-family: 'Microsoft YaHei', sans-serif; font-size: 13px; }
            QLabel { color: #475569; }
            QPushButton { background-color: #ffffff; color: #334155; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 12px; font-weight: 500; }
            QPushButton:hover { background-color: #f1f5f9; border-color: #2563eb; color: #0f172a; }
            QPushButton:disabled { background-color: #f1f5f9; color: #94a3b8; border-color: #e2e8f0; }
            QPushButton:checked { background-color: #2563eb; color: #ffffff; font-weight: bold; }
            QPushButton#primaryBtn { background-color: #2563eb; color: #ffffff; border: none; font-weight: bold; }
            QPushButton#primaryBtn:hover { background-color: #1d4ed8; }
            QPushButton#primaryBtn:disabled { background-color: #93c5fd; color: #f8fafc; }
            QPushButton#folderBtn { background-color: #ffffff; color: #d97706; border: 1px solid #d97706; font-weight: bold; }
            QPushButton#folderBtn:hover { background-color: #fef3c7; }
            QPushButton#dangerBtn { background-color: #ef4444; color: #ffffff; border: none; font-weight: bold; }
            QPushButton#dangerBtn:hover { background-color: #dc2626; }
            QPushButton#zoomBtn { background: transparent; border: none; color: #475569; font-size: 14px; font-weight: bold; padding: 0 4px; min-width: 18px; }
            QPushButton#zoomBtn:hover { background-color: #e2e8f0; border-radius: 3px; color: #0f172a; }
            
            QLineEdit, QComboBox { background-color: #ffffff; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px; }
            QTextEdit { background-color: #ffffff; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; }
            QLineEdit:focus, QTextEdit:focus, QComboBox:focus { border: 1px solid #2563eb; }
            QComboBox QAbstractItemView { background-color: #ffffff; color: #0f172a; selection-background-color: #bfdbfe; border: 1px solid #cbd5e1; }
            
            QScrollBar:vertical { background-color: #f8fafc; width: 8px; margin: 0px; border-radius: 4px; }
            QScrollBar::handle:vertical { background-color: #cbd5e1; min-height: 28px; border-radius: 4px; }
            QScrollBar::handle:vertical:hover { background-color: #94a3b8; }
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0px; background: none; }
            QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical { background: none; }
            QScrollBar:horizontal { background-color: #f8fafc; height: 8px; margin: 0px; border-radius: 4px; }
            QScrollBar::handle:horizontal { background-color: #cbd5e1; min-width: 28px; border-radius: 4px; }
            QScrollBar::handle:horizontal:hover { background-color: #94a3b8; }
            QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal { width: 0px; background: none; }
            QScrollBar::add-page:horizontal, QScrollBar::sub-page:horizontal { background: none; }

            QTreeWidget, QTableWidget { background-color: #ffffff; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; }
            QTreeWidget::item, QTableWidget::item { padding: 7px 4px; border-bottom: 1px solid #f1f5f9; }
            QTreeWidget::item:selected, QTableWidget::item:selected { background-color: #2563eb; color: #ffffff; }
            QTreeWidget::drop-indicator { background-color: #2563eb; height: 2px; }
            QHeaderView::section { background-color: #f1f5f9; color: #1e40af; padding: 6px 8px; border: none; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #cbd5e1; font-weight: bold; }
            
            QMenu { background-color: #ffffff; color: #1e293b; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px; }
            QMenu::item:selected { background-color: #2563eb; color: #ffffff; }
        """
    },
    "其它色 (护眼森林绿)": {
        "normal_color": QColor("#f0fdf4"),
        "folder_color": QColor("#34d399"),
        "sub_color": QColor("#a7f3d0"),
        "preview_color": QColor("#86efac"),
        "qss": """
            QMainWindow, QDialog { background-color: #1c2e26; color: #e2e8f0; font-family: 'Microsoft YaHei', sans-serif; font-size: 13px; }
            QLabel { color: #a7f3d0; }
            QPushButton { background-color: #243b31; color: #d1fae5; border: 1px solid #345345; border-radius: 6px; padding: 5px 12px; font-weight: 500; }
            QPushButton:hover { background-color: #345345; border-color: #10b981; color: #ffffff; }
            QPushButton:disabled { background-color: #1a2922; color: #406050; border-color: #22382e; }
            QPushButton:checked { background-color: #10b981; color: #064e3b; font-weight: bold; }
            QPushButton#primaryBtn { background-color: #10b981; color: #064e3b; border: none; font-weight: bold; }
            QPushButton#primaryBtn:hover { background-color: #34d399; }
            QPushButton#primaryBtn:disabled { background-color: #1f503e; color: #4e806c; }
            QPushButton#folderBtn { background-color: #243b31; color: #facc15; border: 1px solid #facc15; font-weight: bold; }
            QPushButton#folderBtn:hover { background-color: #facc15; color: #1c2e26; }
            QPushButton#dangerBtn { background-color: #ef4444; color: #ffffff; border: none; font-weight: bold; }
            QPushButton#dangerBtn:hover { background-color: #dc2626; }
            QPushButton#zoomBtn { background: transparent; border: none; color: #a7f3d0; font-size: 14px; font-weight: bold; padding: 0 4px; min-width: 18px; }
            QPushButton#zoomBtn:hover { background-color: #345345; border-radius: 3px; color: #ffffff; }
            
            QLineEdit, QComboBox { background-color: #15241e; color: #f0fdf4; border: 1px solid #284438; border-radius: 6px; padding: 5px; }
            QTextEdit { background-color: #15241e; color: #f0fdf4; border: 1px solid #284438; border-radius: 6px; padding: 10px 14px; }
            QLineEdit:focus, QTextEdit:focus, QComboBox:focus { border: 1px solid #10b981; }
            QComboBox QAbstractItemView { background-color: #15241e; color: #ffffff; selection-background-color: #065f46; border: 1px solid #284438; }
            
            QScrollBar:vertical { background-color: #15241e; width: 8px; margin: 0px; border-radius: 4px; }
            QScrollBar::handle:vertical { background-color: #284438; min-height: 28px; border-radius: 4px; }
            QScrollBar::handle:vertical:hover { background-color: #345345; }
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0px; background: none; }
            QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical { background: none; }
            QScrollBar:horizontal { background-color: #15241e; height: 8px; margin: 0px; border-radius: 4px; }
            QScrollBar::handle:horizontal { background-color: #284438; min-width: 28px; border-radius: 4px; }
            QScrollBar::handle:horizontal:hover { background-color: #345345; }
            QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal { width: 0px; background: none; }
            QScrollBar::add-page:horizontal, QScrollBar::sub-page:horizontal { background: none; }

            QTreeWidget, QTableWidget { background-color: #15241e; color: #f0fdf4; border: 1px solid #284438; border-radius: 6px; outline: none; }
            QTreeWidget::item, QTableWidget::item { padding: 7px 4px; border-bottom: 1px solid #1f362c; }
            QTreeWidget::item:selected, QTableWidget::item:selected { background-color: #059669; color: #ffffff; }
            QTreeWidget::drop-indicator { background-color: #10b981; height: 2px; }
            QHeaderView::section { background-color: #1f362c; color: #6ee7b7; padding: 6px 8px; border: none; border-right: 1px solid #284438; border-bottom: 1px solid #284438; font-weight: bold; }
            
            QMenu { background-color: #1f362c; color: #ecfdf5; border: 1px solid #345345; border-radius: 6px; padding: 4px; }
            QMenu::item:selected { background-color: #10b981; color: #064e3b; }
        """
    },
    "其它色 (深海幽蓝)": {
        "normal_color": QColor("#f8fafc"),
        "folder_color": QColor("#38bdf8"),
        "sub_color": QColor("#94a3b8"),
        "preview_color": QColor("#38bdf8"),
        "qss": """
            QMainWindow, QDialog { background-color: #0f172a; color: #f8fafc; font-family: 'Microsoft YaHei', sans-serif; font-size: 13px; }
            QLabel { color: #94a3b8; }
            QPushButton { background-color: #1e293b; color: #e2e8f0; border: 1px solid #334155; border-radius: 6px; padding: 5px 12px; font-weight: 500; }
            QPushButton:hover { background-color: #334155; border-color: #38bdf8; color: #ffffff; }
            QPushButton:disabled { background-color: #111a2e; color: #43516c; border-color: #1f2b45; }
            QPushButton:checked { background-color: #0284c7; color: #ffffff; font-weight: bold; }
            QPushButton#primaryBtn { background-color: #0284c7; color: #ffffff; border: none; font-weight: bold; }
            QPushButton#primaryBtn:hover { background-color: #0369a1; }
            QPushButton#primaryBtn:disabled { background-color: #1a4263; color: #4d779e; }
            QPushButton#folderBtn { background-color: #1e293b; color: #38bdf8; border: 1px solid #38bdf8; font-weight: bold; }
            QPushButton#folderBtn:hover { background-color: #38bdf8; color: #0f172a; }
            QPushButton#dangerBtn { background-color: #f43f5e; color: #ffffff; border: none; font-weight: bold; }
            QPushButton#dangerBtn:hover { background-color: #e11d48; }
            QPushButton#zoomBtn { background: transparent; border: none; color: #94a3b8; font-size: 14px; font-weight: bold; padding: 0 4px; min-width: 18px; }
            QPushButton#zoomBtn:hover { background-color: #334155; border-radius: 3px; color: #ffffff; }
            
            QLineEdit, QComboBox { background-color: #0b1120; color: #ffffff; border: 1px solid #1e293b; border-radius: 6px; padding: 5px; }
            QTextEdit { background-color: #0b1120; color: #f8fafc; border: 1px solid #1e293b; border-radius: 6px; padding: 10px 14px; }
            QLineEdit:focus, QTextEdit:focus, QComboBox:focus { border: 1px solid #38bdf8; }
            QComboBox QAbstractItemView { background-color: #0b1120; color: #ffffff; selection-background-color: #0369a1; border: 1px solid #1e293b; }
            
            QScrollBar:vertical { background-color: #0b1120; width: 8px; margin: 0px; border-radius: 4px; }
            QScrollBar::handle:vertical { background-color: #1e293b; min-height: 28px; border-radius: 4px; }
            QScrollBar::handle:vertical:hover { background-color: #334155; }
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0px; background: none; }
            QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical { background: none; }
            QScrollBar:horizontal { background-color: #0b1120; height: 8px; margin: 0px; border-radius: 4px; }
            QScrollBar::handle:horizontal { background-color: #1e293b; min-width: 28px; border-radius: 4px; }
            QScrollBar::handle:horizontal:hover { background-color: #334155; }
            QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal { width: 0px; background: none; }
            QScrollBar::add-page:horizontal, QScrollBar::sub-page:horizontal { background: none; }

            QTreeWidget, QTableWidget { background-color: #0b1120; color: #f8fafc; border: 1px solid #1e293b; border-radius: 6px; outline: none; }
            QTreeWidget::item, QTableWidget::item { padding: 7px 4px; border-bottom: 1px solid #172554; }
            QTreeWidget::item:selected, QTableWidget::item:selected { background-color: #0284c7; color: #ffffff; }
            QTreeWidget::drop-indicator { background-color: #38bdf8; height: 2px; }
            QHeaderView::section { background-color: #172554; color: #38bdf8; padding: 6px 8px; border: none; border-right: 1px solid #1e293b; border-bottom: 1px solid #1e293b; font-weight: bold; }
            
            QMenu { background-color: #172554; color: #e2e8f0; border: 1px solid #334155; border-radius: 6px; padding: 4px; }
            QMenu::item:selected { background-color: #38bdf8; color: #0b1120; }
        """
    }
}

# ----------------- 剪贴板自毁看门狗 -----------------
class ClipboardGuard(QObject):
    _instance = None
    clipboard_cleared_signal = pyqtSignal()
    countdown_tick_signal = pyqtSignal(int)

    @classmethod
    def instance(cls):
        if cls._instance is None:
            cls._instance = ClipboardGuard(QApplication.instance())
        return cls._instance

    def __init__(self, parent=None):
        super().__init__(parent)
        self.tick_timer = QTimer(self)
        self.tick_timer.timeout.connect(self._on_tick)
        self.last_copied_hash = None
        self.remaining_seconds = 0

    @staticmethod
    def normalize(s: str) -> str:
        if not s:
            return ""
        return s.replace('\u2029', '\n').replace('\r\n', '\n').replace('\r', '\n').strip()

    def arm(self, text, timeout_seconds=30):
        norm = self.normalize(text)
        if not norm or timeout_seconds <= 0:
            return
        self.last_copied_hash = hashlib.sha256(norm.encode('utf-8')).hexdigest()
        self.remaining_seconds = timeout_seconds
        self.countdown_tick_signal.emit(self.remaining_seconds)
        self.tick_timer.start(1000)

    def _on_tick(self):
        self.remaining_seconds -= 1
        if self.remaining_seconds > 0:
            self.countdown_tick_signal.emit(self.remaining_seconds)
        else:
            self.tick_timer.stop()
            self.do_clear_clipboard()

    def do_clear_clipboard(self):
        clip = QApplication.clipboard()
        current_text = clip.text()
        if current_text:
            norm_current = self.normalize(current_text)
            if norm_current and hashlib.sha256(norm_current.encode('utf-8')).hexdigest() == self.last_copied_hash:
                clip.clear()
                if clip.text():
                    QTimer.singleShot(150, clip.clear)
        self.remaining_seconds = 0
        self.last_copied_hash = None
        self.clipboard_cleared_signal.emit()


# ----------------- 原生缩放与链接增强 ZoomableTextEdit -----------------
class ZoomableTextEdit(QTextEdit):
    zoom_changed = pyqtSignal(int)
    text_copied_signal = pyqtSignal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.zoom_level = 100
        self.setMouseTracking(True)
        base_f = self.font()
        base_f.setPointSize(13)
        self.setFont(base_f)

    def wheelEvent(self, event):
        if event.modifiers() == Qt.KeyboardModifier.ControlModifier:
            delta = event.angleDelta().y()
            if delta > 0:
                self.change_zoom(10)
            elif delta < 0:
                self.change_zoom(-10)
            event.accept()
        else:
            super().wheelEvent(event)

    def change_zoom(self, step):
        if step > 0 and self.zoom_level < 300:
            self.zoom_level += 10
            self.zoomIn(1)
            self.zoom_changed.emit(self.zoom_level)
        elif step < 0 and self.zoom_level > 40:
            self.zoom_level -= 10
            self.zoomOut(1)
            self.zoom_changed.emit(self.zoom_level)

    def copy(self):
        selected = self.textCursor().selectedText()
        super().copy()
        QTimer.singleShot(25, lambda: self._emit_copied(selected))

    def cut(self):
        selected = self.textCursor().selectedText()
        super().cut()
        QTimer.singleShot(25, lambda: self._emit_copied(selected))

    def _emit_copied(self, fallback_selected):
        clip_text = QApplication.clipboard().text() or fallback_selected
        if clip_text:
            self.text_copied_signal.emit(ClipboardGuard.normalize(clip_text))

    def load_document_content(self, content):
        if content.strip().startswith("<p>") and not ("<html" in content.lower()):
            cleaned = content.replace("<p>&nbsp;</p>", "\n")
            cleaned = re.sub(r'</p>\s*<p>', '\n', cleaned)
            cleaned = re.sub(r'^<p>', '', cleaned)
            cleaned = re.sub(r'</p>$', '', cleaned)
            cleaned = html.unescape(cleaned)
            self.setPlainText(cleaned)
        elif "<html" in content.lower():
            clean_html = re.sub(r'font-size\s*:\s*13(\.0)?pt;?', '', content, flags=re.IGNORECASE)
            self.setHtml(clean_html)
        else:
            self.setPlainText(content)

        self.zoom_level = 100
        self.zoom_changed.emit(100)

    # 鼠标悬浮提示超链接
    def mouseMoveEvent(self, event):
        cursor = self.cursorForPosition(event.pos())
        fmt = cursor.charFormat()
        if fmt.isAnchor() and fmt.anchorHref():
            tip = f"🔗 {fmt.anchorHref()} (Ctrl+点击访问)" if not self.isReadOnly() else f"🔗 {fmt.anchorHref()} (点击访问)"
            self.setToolTip(tip)
        else:
            self.setToolTip("")
        super().mouseMoveEvent(event)

    # 支持只读模式直接点击链接，或编辑模式下按住 Ctrl 点击打开链接
    def mouseReleaseEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            cursor = self.cursorForPosition(event.pos())
            fmt = cursor.charFormat()
            if fmt.isAnchor() and fmt.anchorHref():
                if (event.modifiers() == Qt.KeyboardModifier.ControlModifier) or self.isReadOnly():
                    QDesktopServices.openUrl(QUrl(fmt.anchorHref()))
                    event.accept()
                    return
        super().mouseReleaseEvent(event)


# ----------------- 插入与编辑超链接专用弹窗 -----------------
class LinkInputDialog(QDialog):
    def __init__(self, text="", url="", parent=None):
        super().__init__(parent)
        self.setWindowIcon(get_app_icon())
        self.setWindowTitle("插入链接" if not url else "编辑链接")
        self.setFixedSize(440, 200)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 18, 20, 16)
        layout.setSpacing(12)
        
        lbl_text = QLabel("链接显示文本:")
        lbl_text.setStyleSheet("font-weight: bold;")
        self.input_text = QLineEdit(text)
        self.input_text.setPlaceholderText("请输入在文档中显示的链接文本...")
        
        lbl_url = QLabel("链接目标地址 (URL):")
        lbl_url.setStyleSheet("font-weight: bold;")
        self.input_url = QLineEdit(url if url else "https://")
        self.input_url.setPlaceholderText("https://example.com...")
        self.input_url.returnPressed.connect(self.on_submit)
        
        layout.addWidget(lbl_text)
        layout.addWidget(self.input_text)
        layout.addWidget(lbl_url)
        layout.addWidget(self.input_url)
        layout.addStretch()
        
        btn_bar = QHBoxLayout()
        btn_bar.addStretch()
        btn_cancel = QPushButton("取消")
        btn_cancel.clicked.connect(self.reject)
        btn_ok = QPushButton("确认插入" if not url else "保存链接")
        btn_ok.setObjectName("primaryBtn")
        btn_ok.clicked.connect(self.on_submit)
        btn_bar.addWidget(btn_cancel)
        btn_bar.addWidget(btn_ok)
        layout.addLayout(btn_bar)

    def on_submit(self):
        url = self.input_url.text().strip()
        if not url or url in ("http://", "https://"):
            QMessageBox.warning(self, "提示", "请输入有效的目标网址 URL！")
            self.input_url.setFocus()
            return
        
        if not (url.startswith("http://") or url.startswith("https://") or url.startswith("mailto:") or url.startswith("ftp://")):
            url = "https://" + url
            self.input_url.setText(url)
        self.accept()

    def get_data(self):
        return self.input_text.text().strip(), self.input_url.text().strip()


# ----------------- 安全核心（AES-256-GCM + PBKDF2） -----------------
class SecurityManager:
    @staticmethod
    def hash_password(password: str, salt: bytes = None) -> tuple[bytes, bytes]:
        if not salt:
            salt = secrets.token_bytes(16)
        pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100_000)
        return pwd_hash, salt

    @staticmethod
    def derive_aes_key(password: str, salt: bytes) -> bytes:
        return hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100_000)

    @staticmethod
    def encrypt_data(data_bytes: bytes, key: bytes) -> tuple[bytes, bytes]:
        aesgcm = AESGCM(key)
        nonce = secrets.token_bytes(12)
        ciphertext = aesgcm.encrypt(nonce, data_bytes, None)
        return ciphertext, nonce

    @staticmethod
    def decrypt_data(ciphertext: bytes, nonce: bytes, key: bytes) -> bytes:
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ciphertext, None)


# ----------------- 多格式外部文档读取解析器 -----------------
class DocumentParser:
    @staticmethod
    def parse_file(file_path: str) -> str:
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".txt":
            return DocumentParser._read_txt(file_path)
        elif ext == ".docx":
            return DocumentParser._read_docx(file_path)
        elif ext == ".odt":
            return DocumentParser._read_odt(file_path)
        elif ext == ".doc":
            return DocumentParser._read_doc(file_path)
        else:
            return DocumentParser._read_txt(file_path)

    @staticmethod
    def _read_txt(path: str) -> str:
        for enc in ['utf-8', 'gb18030', 'gbk', 'utf-16', 'big5', 'latin1']:
            try:
                with open(path, 'r', encoding=enc) as f:
                    return f.read()
            except (UnicodeDecodeError, UnicodeError):
                continue
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()

    @staticmethod
    def _read_docx(path: str) -> str:
        with zipfile.ZipFile(path) as z:
            xml_content = z.read("word/document.xml")
        tree = ET.fromstring(xml_content)
        paragraphs = []
        for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
            texts = [node.text for node in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if node.text]
            paragraphs.append(''.join(texts))
        return '\n'.join(paragraphs)

    @staticmethod
    def _read_odt(path: str) -> str:
        with zipfile.ZipFile(path) as z:
            xml_content = z.read("content.xml")
        tree = ET.fromstring(xml_content)
        paragraphs = []
        for elem in tree.iter():
            tag = elem.tag.split('}')[-1]
            if tag in ('p', 'h'):
                text = "".join(elem.itertext()).strip()
                if text:
                    paragraphs.append(text)
        return '\n'.join(paragraphs)

    @staticmethod
    def _read_doc(path: str) -> str:
        if sys.platform == "win32":
            word = None
            try:
                import win32com.client
                word = win32com.client.Dispatch("Word.Application")
                word.Visible = False
                doc = word.Documents.Open(os.path.abspath(path))
                text = doc.Content.Text
                doc.Close(False)
                return text.replace('\r\n', '\n').replace('\r', '\n')
            except Exception:
                pass
            finally:
                if word:
                    try:
                        word.Quit()
                    except Exception:
                        pass
        try:
            with open(path, 'rb') as f:
                content = f.read()
            texts = re.findall(b'[\x20-\x7E\x80-\xFE\n\r\t]{4,}', content)
            decoded_parts = []
            for t in texts:
                for enc in ['utf-8', 'gb18030', 'latin1']:
                    try:
                        decoded_parts.append(t.decode(enc))
                        break
                    except Exception:
                        continue
            extracted = "\n".join(decoded_parts)
            if len(extracted.strip()) > 10:
                return extracted
        except Exception:
            pass
        raise ValueError("无法直接解析此 .doc 文件，建议在 Word 中另存为 .docx 或 .txt 后导入。")


# ==================== 专业多格式文档导出器（全面支持超链接与样式） ====================
class DocumentExporter:
    @staticmethod
    def export_file(file_path: str, content: str, title: str = ""):
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".docx":
            DocumentExporter._export_to_docx(file_path, content, title)
        elif ext in (".html", ".htm"):
            DocumentExporter._export_to_html(file_path, content, title)
        elif ext == ".md":
            DocumentExporter._export_to_markdown(file_path, content, title)
        else:
            DocumentExporter._export_to_txt(file_path, content)

    @staticmethod
    def _export_to_txt(path: str, content: str):
        doc = QTextDocument()
        doc.setHtml(content)
        plain_text = doc.toPlainText()
        with open(path, "w", encoding="utf-8") as f:
            f.write(plain_text)

    @staticmethod
    def _export_to_html(path: str, content: str, title: str = ""):
        body_match = re.search(r'<body[^>]*>(.*?)</body>', content, re.DOTALL | re.IGNORECASE)
        body_html = body_match.group(1).strip() if body_match else content

        html_template = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html.escape(title or '导出文档')}</title>
<style>
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Microsoft YaHei", sans-serif;
    line-height: 1.6;
    max-width: 860px;
    margin: 40px auto;
    padding: 0 24px;
    color: #1f2937;
    background-color: #ffffff;
  }}
  p {{ margin: 0.5em 0; }}
  a {{ color: #2563eb; text-decoration: underline; }}
</style>
</head>
<body>
{body_html}
</body>
</html>"""
        with open(path, "w", encoding="utf-8") as f:
            f.write(html_template)

    @staticmethod
    def _export_to_markdown(path: str, content: str, title: str = ""):
        doc = QTextDocument()
        doc.setHtml(content)
        md_lines = []
        if title:
            md_lines.append(f"# {title}\n")

        block = doc.begin()
        while block.isValid():
            line_parts = []
            it = block.begin()
            while not it.atEnd():
                frag = it.fragment()
                if frag.isValid():
                    text = frag.text()
                    if text:
                        fmt = frag.charFormat()
                        is_bold = fmt.fontWeight() == QFont.Weight.Bold or fmt.font().bold()
                        is_italic = fmt.fontItalic()

                        # 提取字体颜色与高亮
                        has_fg = fmt.hasProperty(QTextFormat.Property.ForegroundBrush)
                        fg_color = fmt.foreground().color() if has_fg else None
                        color_hex = f"#{fg_color.red():02x}{fg_color.green():02x}{fg_color.blue():02x}" if fg_color and fg_color.isValid() else None

                        has_bg = fmt.hasProperty(QTextFormat.Property.BackgroundBrush)
                        bg_color = fmt.background().color() if has_bg else None
                        bg_hex = f"#{bg_color.red():02x}{bg_color.green():02x}{bg_color.blue():02x}" if bg_color and bg_color.isValid() and bg_color.alpha() > 0 else None

                        t = text
                        # 如果是超链接
                        if fmt.isAnchor() and fmt.anchorHref():
                            t = f"[{t}]({fmt.anchorHref()})"
                        else:
                            if is_bold:
                                t = f"**{t}**"
                            if is_italic:
                                t = f"*{t}*"
                            if bg_hex:
                                t = f'<mark style="background-color: {bg_hex};">{t}</mark>'
                            if color_hex and color_hex.lower() not in ("#000000", "#ffffff", "#2563eb"):
                                t = f'<span style="color: {color_hex};">{t}</span>'

                        line_parts.append(t)
                it += 1
            md_lines.append("".join(line_parts))
            block = block.next()

        with open(path, "w", encoding="utf-8") as f:
            f.write("\n\n".join(md_lines))

    @staticmethod
    def _export_to_docx(path: str, content: str, title: str = ""):
        doc = QTextDocument()
        doc.setHtml(content)

        paragraphs_xml = []
        hyperlink_relationships = []  # 记录所有超链接关系映射

        block = doc.begin()
        while block.isValid():
            runs_xml = []
            it = block.begin()
            while not it.atEnd():
                frag = it.fragment()
                if frag.isValid():
                    text = frag.text()
                    if text:
                        fmt = frag.charFormat()
                        is_bold = fmt.fontWeight() == QFont.Weight.Bold or fmt.font().bold()
                        is_italic = fmt.fontItalic()
                        is_underline = fmt.fontUnderline()

                        is_link = fmt.isAnchor() and bool(fmt.anchorHref())
                        link_rel_id = None
                        if is_link:
                            link_rel_id = f"rIdLink_{len(hyperlink_relationships) + 10}"
                            hyperlink_relationships.append((link_rel_id, fmt.anchorHref()))
                            is_underline = True

                        has_fg = fmt.hasProperty(QTextFormat.Property.ForegroundBrush)
                        fg_color = fmt.foreground().color() if has_fg else None
                        color_hex = f"{fg_color.red():02X}{fg_color.green():02X}{fg_color.blue():02X}" if fg_color and fg_color.isValid() else None
                        if is_link and not color_hex:
                            color_hex = "2563EB"

                        has_bg = fmt.hasProperty(QTextFormat.Property.BackgroundBrush)
                        bg_color = fmt.background().color() if has_bg else None
                        bg_hex = f"{bg_color.red():02X}{bg_color.green():02X}{bg_color.blue():02X}" if bg_color and bg_color.isValid() and bg_color.alpha() > 0 else None

                        pt = fmt.fontPointSize()
                        sz_val = int(pt * 2) if pt > 0 else None
                        family = fmt.fontFamily()

                        rpr_elements = []
                        if family:
                            rpr_elements.append(f'<w:rFonts w:ascii="{html.escape(family)}" w:hAnsi="{html.escape(family)}" w:eastAsia="{html.escape(family)}"/>')
                        if is_bold:
                            rpr_elements.append('<w:b/>')
                        if is_italic:
                            rpr_elements.append('<w:i/>')
                        if is_underline:
                            rpr_elements.append('<w:u w:val="single"/>')
                        if color_hex:
                            rpr_elements.append(f'<w:color w:val="{color_hex}"/>')
                        if bg_hex:
                            rpr_elements.append(f'<w:shd w:val="clear" w:color="auto" w:fill="{bg_hex}"/>')
                        if sz_val:
                            rpr_elements.append(f'<w:sz w:val="{sz_val}"/>')

                        rpr_str = f"<w:rPr>{''.join(rpr_elements)}</w:rPr>" if rpr_elements else ""

                        lines = text.split('\n')
                        for idx, line in enumerate(lines):
                            escaped_text = html.escape(line)
                            r_chunk = f'<w:r>{rpr_str}<w:t xml:space="preserve">{escaped_text}</w:t></w:r>'
                            if is_link and link_rel_id:
                                runs_xml.append(f'<w:hyperlink r:id="{link_rel_id}">{r_chunk}</w:hyperlink>')
                            else:
                                runs_xml.append(r_chunk)

                            if idx < len(lines) - 1:
                                runs_xml.append('<w:r><w:br/></w:r>')
                it += 1

            if runs_xml:
                paragraphs_xml.append(f'<w:p>{"".join(runs_xml)}</w:p>')
            else:
                paragraphs_xml.append('<w:p/>')

            block = block.next()

        body_xml = "".join(paragraphs_xml)

        doc_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    {body_xml}
  </w:body>
</w:document>'''

        content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>'''

        root_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''

        doc_rels_parts = []
        for r_id, target in hyperlink_relationships:
            doc_rels_parts.append(f'<Relationship Id="{r_id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="{html.escape(target)}" TargetMode="External"/>')
        
        doc_rels = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  {''.join(doc_rels_parts)}
</Relationships>'''

        with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr('[Content_Types].xml', content_types)
            zf.writestr('_rels/.rels', root_rels)
            zf.writestr('word/document.xml', doc_xml)
            if hyperlink_relationships:
                zf.writestr('word/_rels/document.xml.rels', doc_rels)


# ----------------- 可拖拽树形控件 (VaultTreeWidget) -----------------
class VaultTreeWidget(QTreeWidget):
    item_dropped_signal = pyqtSignal(list, str, str, bool)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setDragEnabled(True)
        self.setAcceptDrops(True)
        self.setDropIndicatorShown(True)
        self.setDragDropMode(QAbstractItemView.DragDropMode.InternalMove)
        self.setDefaultDropAction(Qt.DropAction.MoveAction)
        self.setSelectionMode(QAbstractItemView.SelectionMode.ExtendedSelection)
        self.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)

    def dropEvent(self, event):
        target_item = self.itemAt(event.position().toPoint())
        drop_pos = self.dropIndicatorPosition()

        selected_items = self.selectedItems()
        if not selected_items:
            event.ignore()
            return

        dragged_ids = [item.data(0, Qt.ItemDataRole.UserRole) for item in selected_items if item.data(0, Qt.ItemDataRole.UserRole)]
        if not dragged_ids:
            event.ignore()
            return

        target_id = ""
        new_parent_id = ""
        is_below = False

        if not target_item or drop_pos == QAbstractItemView.DropIndicatorPosition.OnViewport:
            new_parent_id = ""
        elif drop_pos == QAbstractItemView.DropIndicatorPosition.OnItem:
            target_id = target_item.data(0, Qt.ItemDataRole.UserRole)
            target_doc = self.window().get_doc_by_id(target_id)
            if target_doc and target_doc.get("type") == "folder":
                new_parent_id = target_id
            else:
                new_parent_id = target_doc.get("parent_id", "") if target_doc else ""
        else:
            target_id = target_item.data(0, Qt.ItemDataRole.UserRole)
            target_doc = self.window().get_doc_by_id(target_id)
            new_parent_id = target_doc.get("parent_id", "") if target_doc else ""
            is_below = (drop_pos == QAbstractItemView.DropIndicatorPosition.BelowItem)

        for d_id in dragged_ids:
            d_doc = self.window().get_doc_by_id(d_id)
            if d_doc and d_doc.get("type") == "folder":
                if self.window().is_ancestor_of(d_id, new_parent_id):
                    QMessageBox.warning(self, "操作无效", "不能将文件夹移动到它自身或它的子文件夹中！")
                    event.ignore()
                    return

        event.accept()
        self.item_dropped_signal.emit(dragged_ids, new_parent_id, target_id, is_below)


# ----------------- 功能介绍弹窗 -----------------
class FeatureIntroDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowIcon(get_app_icon())
        self.setWindowTitle("安全文档管理系统 - 功能与安全特性介绍")
        self.setFixedSize(680, 500)
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 18, 20, 18)
        layout.setSpacing(12)

        header = QLabel("🛡️ Secure Document Suite 系统特性概览")
        header.setStyleSheet("font-size: 16px; font-weight: bold; color: #7aa2f7;")
        layout.addWidget(header)

        intro_text = QTextEdit()
        intro_text.setReadOnly(True)
        intro_text.setStyleSheet("border-radius: 6px; padding: 12px; font-size: 13px; line-height: 1.6;")
        
        intro_content = """
<h3 style="color:#7aa2f7; margin-top:0px;">1. 工业级机密存储架构</h3>
<ul>
  <li><b>底层军工级加密：</b>采用 <b>AES-256-GCM</b> 认证加密算法，所有文档正文与元数据均在内存中实时密文加解密，磁盘只存放强加密 Payload。</li>
  <li><b>密钥高强度保护：</b>采用 <b>PBKDF2-HMAC-SHA256</b> 进行 100,000 次哈希迭代计算派生秘钥，杜绝暴力彩虹表破解。</li>
</ul>

<h3 style="color:#7aa2f7;">2. 内存与剪贴板主动防泄露</h3>
<ul>
  <li><b>剪贴板定时自毁看门狗：</b>在编辑器内复制任意敏感数据后，系统会精准识别文本哈希并在后台开启安全倒计时，超时自动清除系统剪贴板。</li>
  <li><b>文档防误触锁定：</b>支持打开文档时默认开启只读保护锁，防止手滑误删或误改关键信息。</li>
</ul>

<h3 style="color:#7aa2f7;">3. 全能文档导入与富文本无损导出</h3>
<ul>
  <li><b>多格式外部导入：</b>支持 <b>.txt、.docx、.odt、.doc</b> 等常见文档直接导入解密入库。</li>
  <li><b>富文本样式无损导出：</b>支持选中任意单篇文档，无缝导出为 <b>Word 文档 (.docx)、纯文本 (.txt)、HTML 网页 (.html) 或 Markdown (.md)</b>，颜色、高亮背景、超链接均能完美保留并过滤一切脏标记。</li>
</ul>

<h3 style="color:#7aa2f7;">4. 自由层级与树形管理</h3>
<ul>
  <li><b>无极限树形目录：</b>支持分类文件夹多层级嵌套，支持鼠标任意拖拽排序或层级移动。</li>
  <li><b>秒级全文检索：</b>内置实时全库多字段检索，自动智能展开目标所在的文件夹结构。</li>
</ul>

<h3 style="color:#7aa2f7;">5. 安全回收站与物理级反取证粉碎</h3>
<ul>
  <li><b>智能防丢还原：</b>即便原父级文件夹已被销毁，还原的文档会自动安全跃升至根目录。</li>
  <li><b>物理彻底粉碎：</b>提供不可逆的数据粉碎销毁，底层执行强随机密文覆写并触发 SQLite 磁盘扇区 <b>VACUUM</b> 整理，杜绝任何数据恢复软件取证。</li>
</ul>
        """
        intro_text.setHtml(intro_content)
        layout.addWidget(intro_text)

        btn_bar = QHBoxLayout()
        btn_bar.addStretch()
        btn_close = QPushButton("了解并返回")
        btn_close.setObjectName("primaryBtn")
        btn_close.setFixedWidth(120)
        btn_close.clicked.connect(self.accept)
        btn_bar.addWidget(btn_close)
        layout.addLayout(btn_bar)


# ----------------- 文档编辑独立窗口（带插入链接与超链接交互） -----------------
class DocumentEditorDialog(QDialog):
    saved_signal = pyqtSignal(dict)
    canvas_style_changed = pyqtSignal(dict)

    def __init__(self, doc_data=None, default_readonly=True, clipboard_timeout=30, initial_canvas_style=None, parent=None):
        super().__init__(parent)
        self.setWindowIcon(get_app_icon())
        self.doc_data = doc_data or {}
        self.is_new = not bool(doc_data.get("name"))
        self.is_readonly = default_readonly if not self.is_new else False
        self.clipboard_timeout = clipboard_timeout
        self.current_canvas_style = initial_canvas_style or {"mode": "default", "bg": "", "fg": ""}
        self._is_saved = False

        self.clip_guard = ClipboardGuard.instance()
        self.clip_guard.clipboard_cleared_signal.connect(self.on_clipboard_cleared)
        self.clip_guard.countdown_tick_signal.connect(self.on_clipboard_countdown_tick)

        self.init_ui()
        self.setup_editor_shortcuts()

    def setup_editor_shortcuts(self):
        # 快捷键 Ctrl+K 触发插入链接
        shortcut_link = QShortcut(QKeySequence("Ctrl+K"), self)
        shortcut_link.activated.connect(self.open_insert_link_dialog)

    def init_ui(self):
        self.setWindowTitle("编辑安全文档" if not self.is_new else "新建文档")
        self.resize(960, 640)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 14, 16, 10)
        layout.setSpacing(10)

        # 1. 顶部工具栏
        top_bar = QHBoxLayout()
        top_bar.setSpacing(6)

        self.btn_lock = QPushButton()
        self.btn_lock.setCursor(Qt.CursorShape.PointingHandCursor)
        self.btn_lock.clicked.connect(self.toggle_readonly_mode)

        self.btn_bold = QPushButton("B")
        self.btn_bold.setCheckable(True)
        self.btn_bold.setFixedWidth(32)
        self.btn_bold.setFont(QFont("Arial", 10, QFont.Weight.Bold))
        self.btn_bold.setToolTip("加粗 (Ctrl+B)")
        self.btn_bold.clicked.connect(self.set_bold)

        self.btn_italic = QPushButton("I")
        self.btn_italic.setCheckable(True)
        self.btn_italic.setFixedWidth(32)
        f_italic = QFont("Arial", 10)
        f_italic.setItalic(True)
        self.btn_italic.setFont(f_italic)
        self.btn_italic.setToolTip("斜体 (Ctrl+I)")
        self.btn_italic.clicked.connect(self.set_italic)

        self.btn_underline = QPushButton("U")
        self.btn_underline.setCheckable(True)
        self.btn_underline.setFixedWidth(32)
        f_under = QFont("Arial", 10)
        f_under.setUnderline(True)
        self.btn_underline.setFont(f_under)
        self.btn_underline.setToolTip("下划线 (Ctrl+U)")
        self.btn_underline.clicked.connect(self.set_underline)

        self.font_combo = QComboBox()
        self.font_combo.setMaximumWidth(110)
        self.font_combo.addItems(["微软雅黑", "宋体", "黑体", "楷体", "Segoe UI", "Arial", "Consolas"])
        self.font_combo.activated.connect(lambda idx: self.editor.setCurrentFont(QFont(self.font_combo.itemText(idx))))

        self.size_combo = QComboBox()
        self.size_combo.setMaximumWidth(65)
        self.size_combo.setToolTip("设置选中文本字号大小")
        font_sizes = ["9", "10", "11", "12", "13", "14", "16", "18", "20", "22", "24", "28", "32", "36", "48", "72"]
        self.size_combo.addItems(font_sizes)
        self.size_combo.setCurrentText("13")
        self.size_combo.activated.connect(lambda idx: self.apply_custom_font_size(self.size_combo.itemText(idx)))

        self.btn_color = QPushButton("🎨 颜色 ▾")
        self.btn_color.setToolTip("设置字体颜色 (支持一键清除恢复默认)")
        self.setup_text_color_menu()

        self.btn_highlight = QPushButton("🖍 高亮 ▾")
        self.btn_highlight.setToolTip("设置字体背景高亮 (支持一键清除)")
        self.setup_highlight_menu()

        # 顶部工具栏插入链接按钮
        self.btn_insert_link = QPushButton("🔗 链接")
        self.btn_insert_link.setToolTip("插入超链接 (选中文字后点击或按 Ctrl+K)")
        self.btn_insert_link.clicked.connect(self.open_insert_link_dialog)

        self.btn_canvas_mode = QPushButton("🍃 视效模式 ▾")
        self.btn_canvas_mode.setToolTip("设置文档专用的护眼背景色或自定义色")
        self.setup_canvas_mode_menu()

        top_bar.addWidget(self.btn_lock)
        top_bar.addWidget(self.btn_bold)
        top_bar.addWidget(self.btn_italic)
        top_bar.addWidget(self.btn_underline)
        top_bar.addWidget(self.font_combo)
        top_bar.addWidget(self.size_combo)
        top_bar.addWidget(self.btn_color)
        top_bar.addWidget(self.btn_highlight)
        top_bar.addWidget(self.btn_insert_link)
        top_bar.addWidget(self.btn_canvas_mode)

        top_bar.addStretch()

        title_label = QLabel("文档名称:")
        title_label.setStyleSheet("font-weight: bold;")
        self.title_input = QLineEdit()
        self.title_input.setFixedWidth(170)
        self.title_input.setPlaceholderText("请输入文档名称...")
        default_name = self.doc_data.get("name", f"新文档_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        self.title_input.setText(default_name)

        self.btn_save_exit = QPushButton("💾 保存并退出")
        self.btn_save_exit.setObjectName("primaryBtn")
        self.btn_save_exit.clicked.connect(self.save_and_close)

        top_bar.addWidget(title_label)
        top_bar.addWidget(self.title_input)
        top_bar.addWidget(self.btn_save_exit)
        layout.addLayout(top_bar)

        # 2. 编辑正文区
        self.editor = ZoomableTextEdit()
        self.editor.setPlaceholderText("在此编辑正文...（选中文本后右键或按 Ctrl+K 可插入超链接；按住 Ctrl 点击链接可跳转）")
        self.editor.document().setDocumentMargin(18)
        self.editor.text_copied_signal.connect(self.on_editor_copied_text)

        content = self.doc_data.get("content", "")
        self.editor.load_document_content(content)
        self.editor.document().setModified(False)

        self.editor.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.editor.customContextMenuRequested.connect(self.show_editor_menu)
        self.editor.cursorPositionChanged.connect(self.update_format_buttons)
        self.editor.textChanged.connect(self.update_stats)
        self.editor.zoom_changed.connect(self.update_zoom_label)
        layout.addWidget(self.editor)

        # 3. 底部状态栏
        bottom_bar = QHBoxLayout()
        bottom_bar.setContentsMargins(4, 2, 4, 2)
        bottom_bar.setSpacing(18)

        self.lbl_security_status = QLabel("● 安全已就绪")
        self.lbl_security_status.setStyleSheet("color: #a6adc8; font-weight: 500;")
        bottom_bar.addWidget(self.lbl_security_status)
        bottom_bar.addStretch()

        self.lbl_char_count = QLabel("0 个字符")
        self.lbl_format_type = QLabel("Rich Text/HTML")
        self.lbl_encoding = QLabel("UTF-8")
        self.lbl_crlf = QLabel("Windows (CRLF)")

        zoom_box = QHBoxLayout()
        zoom_box.setSpacing(4)
        self.btn_zoom_out = QPushButton("-")
        self.btn_zoom_out.setObjectName("zoomBtn")
        self.btn_zoom_out.setToolTip("缩小 (Ctrl+滚轮下滚)")
        self.btn_zoom_out.clicked.connect(lambda: self.editor.change_zoom(-10))

        self.lbl_zoom = QLabel("100%")
        self.lbl_zoom.setFixedWidth(42)
        self.lbl_zoom.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self.btn_zoom_in = QPushButton("+")
        self.btn_zoom_in.setObjectName("zoomBtn")
        self.btn_zoom_in.setToolTip("放大 (Ctrl+滚轮上滚)")
        self.btn_zoom_in.clicked.connect(lambda: self.editor.change_zoom(10))

        zoom_box.addWidget(self.btn_zoom_out)
        zoom_box.addWidget(self.lbl_zoom)
        zoom_box.addWidget(self.btn_zoom_in)

        bottom_bar.addWidget(self.lbl_char_count)
        bottom_bar.addWidget(self.lbl_format_type)
        bottom_bar.addWidget(self.lbl_encoding)
        bottom_bar.addWidget(self.lbl_crlf)
        bottom_bar.addLayout(zoom_box)
        layout.addLayout(bottom_bar)

        self.update_stats()
        self.apply_readonly_ui_state()
        self.apply_initial_canvas_style()

        if self.clip_guard.remaining_seconds > 0:
            self.on_clipboard_countdown_tick(self.clip_guard.remaining_seconds)

    def apply_initial_canvas_style(self):
        bg = self.current_canvas_style.get("bg", "")
        fg = self.current_canvas_style.get("fg", "")
        if bg and fg:
            self.editor.setStyleSheet(
                f"QTextEdit {{ background-color: {bg}; color: {fg}; border: 1px solid #4a635d; border-radius: 6px; padding: 10px 14px; }}"
            )

    def setup_canvas_mode_menu(self):
        menu = QMenu(self)
        menu.addAction("🍃 护眼绿模式 (豆沙绿)").triggered.connect(lambda: self.set_canvas_mode("eyecare", "#c7edcc", "#123016"))
        menu.addAction("📜 羊皮纸复古 (暖米黄)").triggered.connect(lambda: self.set_canvas_mode("parchment", "#fbf0d9", "#2d251d"))
        menu.addAction("🌙 纯黑极简模式").triggered.connect(lambda: self.set_canvas_mode("dark", "#000000", "#e0e0e0"))
        menu.addSeparator()
        menu.addAction("🎨 自定义画布背景色...").triggered.connect(self.choose_custom_canvas_bg)
        menu.addAction("↺ 恢复主题默认").triggered.connect(self.reset_canvas_mode)
        self.btn_canvas_mode.setMenu(menu)

    def set_canvas_mode(self, mode_name, bg_color, text_color):
        self.current_canvas_style = {"mode": mode_name, "bg": bg_color, "fg": text_color}
        self.editor.setStyleSheet(
            f"QTextEdit {{ background-color: {bg_color}; color: {text_color}; border: 1px solid #4a635d; border-radius: 6px; padding: 10px 14px; }}"
        )
        self.canvas_style_changed.emit(self.current_canvas_style)

    def choose_custom_canvas_bg(self):
        col = QColorDialog.getColor(QColor("#c7edcc"), self, "选择文档编辑器画布背景色")
        if col.isValid():
            luminance = (col.red() * 0.299 + col.green() * 0.587 + col.blue() * 0.114)
            text_col = "#000000" if luminance > 128 else "#ffffff"
            self.set_canvas_mode("custom", col.name(), text_col)

    def reset_canvas_mode(self):
        self.current_canvas_style = {"mode": "default", "bg": "", "fg": ""}
        self.editor.setStyleSheet("")
        self.canvas_style_changed.emit(self.current_canvas_style)

    def toggle_readonly_mode(self):
        self.is_readonly = not self.is_readonly
        self.apply_readonly_ui_state()

    def apply_readonly_ui_state(self):
        if self.is_readonly:
            self.btn_lock.setText("🔒 只读保护中")
            self.btn_lock.setToolTip("当前处于防误触只读保护模式，内容不可更改。点击解锁编辑。")
            self.btn_lock.setStyleSheet("background-color: #f7768e; color: #ffffff; font-weight: bold;")
            self.editor.setReadOnly(True)
            self.title_input.setReadOnly(True)
            self.set_formatting_enabled(False)
            self.btn_save_exit.setEnabled(False)
            if self.clip_guard.remaining_seconds <= 0:
                self.lbl_security_status.setText("🔒 只读防误触模式已锁定 (点击超链接可直接打开访问)")
                self.lbl_security_status.setStyleSheet("color: #f7768e; font-weight: bold;")
        else:
            self.btn_lock.setText("🔓 允许编辑")
            self.btn_lock.setToolTip("当前处于可编辑状态，点击可锁定为只读模式以防止手滑误改。")
            self.btn_lock.setStyleSheet("background-color: #7aa2f7; color: #15161e; font-weight: bold;")
            self.editor.setReadOnly(False)
            self.title_input.setReadOnly(False)
            self.set_formatting_enabled(True)
            self.btn_save_exit.setEnabled(True)
            if self.clip_guard.remaining_seconds <= 0:
                self.lbl_security_status.setText("● 编辑模式")
                self.lbl_security_status.setStyleSheet("color: #7aa2f7; font-weight: 500;")

    def set_formatting_enabled(self, enabled: bool):
        for w in [self.btn_bold, self.btn_italic, self.btn_underline, self.font_combo, self.size_combo, self.btn_color, self.btn_highlight, self.btn_insert_link]:
            w.setEnabled(enabled)

    def on_editor_copied_text(self, text):
        if self.clipboard_timeout > 0 and text:
            self.clip_guard.arm(text, self.clipboard_timeout)

    def on_clipboard_countdown_tick(self, remaining):
        self.lbl_security_status.setText(f"⏱ 剪贴板敏感数据已复制，将在 {remaining} 秒后自动销毁")
        self.lbl_security_status.setStyleSheet("color: #ff9e64; font-weight: bold;")

    def on_clipboard_cleared(self):
        self.lbl_security_status.setText("🛡️ 剪贴板敏感历史已自动自毁清除")
        self.lbl_security_status.setStyleSheet("color: #9ece6a; font-weight: bold;")
        QTimer.singleShot(4000, self.restore_security_status)

    def restore_security_status(self):
        if self.clip_guard.remaining_seconds <= 0:
            if self.is_readonly:
                self.lbl_security_status.setText("🔒 只读防误触模式已锁定")
                self.lbl_security_status.setStyleSheet("color: #f7768e; font-weight: bold;")
            else:
                self.lbl_security_status.setText("● 编辑模式")
                self.lbl_security_status.setStyleSheet("color: #7aa2f7; font-weight: 500;")

    def apply_custom_font_size(self, size_str):
        try:
            sz = float(size_str)
            self.editor.setFontPointSize(sz)
        except ValueError:
            pass

    def setup_text_color_menu(self):
        menu = QMenu(self)
        menu.addAction("⬛ 纯黑文字").triggered.connect(lambda: self.editor.setTextColor(QColor("#000000")))
        menu.addAction("⬜ 纯白文字").triggered.connect(lambda: self.editor.setTextColor(QColor("#ffffff")))
        menu.addAction("🔴 艳丽红").triggered.connect(lambda: self.editor.setTextColor(QColor("#ef4444")))
        menu.addAction("🔵 科技蓝").triggered.connect(lambda: self.editor.setTextColor(QColor("#3b82f6")))
        menu.addAction("🟢 翠绿色").triggered.connect(lambda: self.editor.setTextColor(QColor("#10b981")))
        menu.addAction("🟠 亮橙色").triggered.connect(lambda: self.editor.setTextColor(QColor("#f97316")))
        menu.addSeparator()
        menu.addAction("🎨 自定义颜色...").triggered.connect(self.choose_custom_text_color)
        menu.addAction("🚫 清除颜色 (恢复默认)").triggered.connect(self.clear_text_color)
        self.btn_color.setMenu(menu)

    def choose_custom_text_color(self):
        col = QColorDialog.getColor(self.editor.textColor(), self, "选择字体颜色")
        if col.isValid():
            self.editor.setTextColor(col)

    def clear_text_color(self):
        cursor = self.editor.textCursor()
        fmt = QTextCharFormat()
        fmt.clearForeground()
        if cursor.hasSelection():
            cursor.mergeCharFormat(fmt)
        self.editor.setCurrentCharFormat(fmt)

    def setup_highlight_menu(self):
        menu = QMenu(self)
        menu.addAction("🟨 荧光黄").triggered.connect(lambda: self.editor.setTextBackgroundColor(QColor("#fff566")))
        menu.addAction("🟩 清新绿").triggered.connect(lambda: self.editor.setTextBackgroundColor(QColor("#8ce99a")))
        menu.addAction("🟦 柔和蓝").triggered.connect(lambda: self.editor.setTextBackgroundColor(QColor("#74c0fc")))
        menu.addAction("🟥 浅粉红").triggered.connect(lambda: self.editor.setTextBackgroundColor(QColor("#ffa8a8")))
        menu.addSeparator()
        menu.addAction("🎨 自定义高亮色...").triggered.connect(self.choose_custom_highlight)
        menu.addAction("🚫 清除高亮").triggered.connect(self.clear_highlight)
        self.btn_highlight.setMenu(menu)

    def choose_custom_highlight(self):
        col = QColorDialog.getColor(QColor("#fff566"), self, "选择字体高亮颜色")
        if col.isValid():
            self.editor.setTextBackgroundColor(col)

    def clear_highlight(self):
        self.editor.setTextBackgroundColor(QColor(Qt.GlobalColor.transparent))

    def set_bold(self):
        self.editor.setFontWeight(QFont.Weight.Bold if self.btn_bold.isChecked() else QFont.Weight.Normal)

    def set_italic(self):
        self.editor.setFontItalic(self.btn_italic.isChecked())

    def set_underline(self):
        self.editor.setFontUnderline(self.btn_underline.isChecked())

    def update_format_buttons(self):
        self.btn_bold.setChecked(self.editor.fontWeight() == QFont.Weight.Bold)
        self.btn_italic.setChecked(self.editor.fontItalic())
        self.btn_underline.setChecked(self.editor.fontUnderline())

        pt_size = self.editor.fontPointSize()
        if pt_size > 0:
            target_str = str(int(pt_size))
            idx = self.size_combo.findText(target_str)
            if idx >= 0 and self.size_combo.currentIndex() != idx:
                self.size_combo.blockSignals(True)
                self.size_combo.setCurrentIndex(idx)
                self.size_combo.blockSignals(False)

        family = self.editor.currentFont().family()
        idx_f = self.font_combo.findText(family)
        if idx_f >= 0 and self.font_combo.currentIndex() != idx_f:
            self.font_combo.blockSignals(True)
            self.font_combo.setCurrentIndex(idx_f)
            self.font_combo.blockSignals(False)

    def update_stats(self):
        self.lbl_char_count.setText(f"{len(self.editor.toPlainText())} 个字符")

    def update_zoom_label(self, zoom_val):
        self.lbl_zoom.setText(f"{zoom_val}%")

    # ==================== 右键上下文菜单与超链接管理 ====================
    def show_editor_menu(self, pos):
        menu = QMenu(self)
        cursor = self.editor.textCursor()
        has_selection = cursor.hasSelection()

        # 精确检查光标位置是否落在超链接上
        click_cursor = self.editor.cursorForPosition(pos)
        fmt_at_click = click_cursor.charFormat()
        is_on_link = fmt_at_click.isAnchor() and bool(fmt_at_click.anchorHref())
        link_url = fmt_at_click.anchorHref() if is_on_link else ""

        # 若右击位置是超链接，提供快捷访问、编辑与取消项
        if is_on_link:
            display_url = (link_url[:28] + "...") if len(link_url) > 28 else link_url
            action_open = menu.addAction(f"🌐 打开链接 ({display_url})")
            action_open.triggered.connect(lambda: QDesktopServices.openUrl(QUrl(link_url)))

            if not self.is_readonly:
                action_edit_link = menu.addAction("🔗 编辑此链接...")
                action_edit_link.triggered.connect(lambda: self.edit_link_at_cursor(click_cursor))

                action_del_link = menu.addAction("🚫 移除超链接")
                action_del_link.triggered.connect(lambda: self.remove_link_at_cursor(click_cursor))
            menu.addSeparator()

        # 选中行或文字时的【插入链接】项
        if not self.is_readonly:
            action_insert_link = menu.addAction("🔗 插入链接... (Ctrl+K)")
            # 选中了文本时允许点击插入
            action_insert_link.setEnabled(has_selection)
            action_insert_link.triggered.connect(self.open_insert_link_dialog)
            menu.addSeparator()

        action_cut = menu.addAction("剪切 (Cut)")
        action_copy = menu.addAction("复制 (Copy)")
        action_paste = menu.addAction("粘贴 (Paste)")
        menu.addSeparator()
        action_del = menu.addAction("删除 (Delete)")
        action_select_all = menu.addAction("全选 (Select All)")

        if self.is_readonly:
            action_cut.setEnabled(False)
            action_paste.setEnabled(False)
            action_del.setEnabled(False)

        action_cut.triggered.connect(self.editor.cut)
        action_copy.triggered.connect(self.editor.copy)
        action_paste.triggered.connect(self.editor.paste)
        action_del.triggered.connect(lambda: self.editor.textCursor().removeSelectedText())
        action_select_all.triggered.connect(self.editor.selectAll)
        menu.exec(self.editor.mapToGlobal(pos))

    def open_insert_link_dialog(self):
        if self.is_readonly:
            return

        cursor = self.editor.textCursor()
        # 若未选中文本，则自动选中当前光标所在行，方便用户快速将整行转化为链接
        if not cursor.hasSelection():
            cursor.select(QTextCursor.SelectionType.LineUnderCursor)
            self.editor.setTextCursor(cursor)

        selected_text = cursor.selectedText().strip()
        dialog = LinkInputDialog(text=selected_text, parent=self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            link_text, link_url = dialog.get_data()
            if not link_text:
                link_text = link_url

            # 构建带下划线蓝色超链接并插入
            link_html = f'<a href="{html.escape(link_url)}" style="color: #2563eb; text-decoration: underline;">{html.escape(link_text)}</a>'
            cursor.insertHtml(link_html)

    def edit_link_at_cursor(self, target_cursor):
        if self.is_readonly:
            return

        # 选中光标所在的整个超链接锚点
        target_cursor.select(QTextCursor.SelectionType.WordUnderCursor)
        curr_text = target_cursor.selectedText()
        curr_url = target_cursor.charFormat().anchorHref()

        dialog = LinkInputDialog(text=curr_text, url=curr_url, parent=self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            new_text, new_url = dialog.get_data()
            if not new_text:
                new_text = new_url
            link_html = f'<a href="{html.escape(new_url)}" style="color: #2563eb; text-decoration: underline;">{html.escape(new_text)}</a>'
            target_cursor.insertHtml(link_html)

    def remove_link_at_cursor(self, target_cursor):
        if self.is_readonly:
            return
        target_cursor.select(QTextCursor.SelectionType.WordUnderCursor)
        plain_text = target_cursor.selectedText()
        
        # 剥离超链接属性，恢复常规文字
        clean_fmt = QTextCharFormat()
        clean_fmt.setAnchor(False)
        clean_fmt.setAnchorHref("")
        clean_fmt.setFontUnderline(False)
        clean_fmt.clearForeground()
        
        target_cursor.insertText(plain_text, clean_fmt)

    def save_and_close(self):
        self.do_save_work()
        self._is_saved = True
        self.accept()

    def do_save_work(self):
        if self.is_readonly or self._is_saved:
            return

        plain_text = self.editor.toPlainText().strip()
        if self.is_new and not plain_text:
            return

        diff = (self.editor.zoom_level - 100) // 10
        if diff > 0:
            self.editor.zoomOut(diff)
        elif diff < 0:
            self.editor.zoomIn(-diff)
        self.editor.zoom_level = 100

        name = self.title_input.text().strip() or "未命名文档"
        content_html = self.editor.toHtml()
        
        has_changed = self.editor.document().isModified() or (name != self.doc_data.get("name"))
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S") if has_changed else self.doc_data.get("updated_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        
        size_bytes = len(plain_text.encode('utf-8'))
        preview = plain_text.replace("\n", " ").strip()[:15]

        if "id" not in self.doc_data:
            self.doc_data["id"] = secrets.token_hex(8)

        saved_doc = {
            "id": self.doc_data["id"],
            "type": "document",
            "parent_id": self.doc_data.get("parent_id", ""),
            "name": name,
            "content": content_html,
            "size": size_bytes,
            "updated_at": now_str,
            "preview": preview,
            "marked": False,
            "in_trash": False
        }
        self._is_saved = True
        self.saved_signal.emit(saved_doc)

    def reject(self):
        if not self._is_saved:
            self.do_save_work()
        super().reject()

    def closeEvent(self, event):
        if not self._is_saved:
            self.do_save_work()
        event.accept()


# ----------------- 垃圾回收站独立弹窗 -----------------
class TrashBinDialog(QDialog):
    restore_requested = pyqtSignal(list)
    shred_requested = pyqtSignal(list)
    clear_all_requested = pyqtSignal()

    def __init__(self, trash_docs, parent=None):
        super().__init__(parent)
        self.setWindowIcon(get_app_icon())
        self.trash_docs = trash_docs
        self.setWindowTitle("回收站管理")
        self.resize(760, 480)
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)

        lbl_desc = QLabel("以下是已移入回收站的文档及文件夹。您可以选择还原，或使用【彻底粉碎】进行物理级不可逆擦除。")
        lbl_desc.setStyleSheet("color: #a6adc8; padding-bottom: 4px;")
        layout.addWidget(lbl_desc)

        self.table = QTableWidget(0, 3)
        self.table.setHorizontalHeaderLabels(["名称", "原大小", "移入时间"])
        self.table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        self.table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.ResizeToContents)
        self.table.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeMode.ResizeToContents)
        self.table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.table.setSelectionMode(QAbstractItemView.SelectionMode.ExtendedSelection)
        self.table.verticalHeader().setVisible(False)
        self.table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        layout.addWidget(self.table)

        self.refresh_table()

        btn_bar = QHBoxLayout()
        self.btn_clear_all = QPushButton("💥 清空并粉碎回收站")
        self.btn_clear_all.setObjectName("dangerBtn")
        self.btn_clear_all.clicked.connect(self.on_clear_all)

        self.btn_shred_selected = QPushButton("💥 彻底粉碎选中项")
        self.btn_shred_selected.setObjectName("dangerBtn")
        self.btn_shred_selected.clicked.connect(self.on_shred_selected)

        self.btn_restore = QPushButton("⟲ 还原选中文档")
        self.btn_restore.setObjectName("primaryBtn")
        self.btn_restore.clicked.connect(self.on_restore_selected)

        btn_close = QPushButton("关闭")
        btn_close.clicked.connect(self.accept)

        btn_bar.addWidget(self.btn_clear_all)
        btn_bar.addStretch()
        btn_bar.addWidget(self.btn_shred_selected)
        btn_bar.addWidget(self.btn_restore)
        btn_bar.addWidget(btn_close)
        layout.addLayout(btn_bar)

    def refresh_table(self):
        self.table.setRowCount(0)
        for r_idx, doc in enumerate(self.trash_docs):
            self.table.insertRow(r_idx)
            is_folder = doc.get("type") == "folder"
            display_name = f"📁 {doc['name']}" if is_folder else f"📄 {doc['name']}"
            item_name = QTableWidgetItem(display_name)
            item_name.setData(Qt.ItemDataRole.UserRole, doc["id"])
            size_kb = "-" if is_folder else f"{doc.get('size', 0) / 1024:.2f} KB"
            item_size = QTableWidgetItem(size_kb)
            item_del_time = QTableWidgetItem(doc.get("deleted_at", doc.get("updated_at", "")))

            self.table.setItem(r_idx, 0, item_name)
            self.table.setItem(r_idx, 1, item_size)
            self.table.setItem(r_idx, 2, item_del_time)

    def get_selected_doc_ids(self):
        selected_rows = list(set([index.row() for index in self.table.selectedIndexes()]))
        doc_ids = []
        for r in selected_rows:
            item = self.table.item(r, 0)
            if item:
                doc_ids.append(item.data(Qt.ItemDataRole.UserRole))
        return doc_ids

    def on_restore_selected(self):
        ids = self.get_selected_doc_ids()
        if not ids:
            QMessageBox.information(self, "提示", "请先选中要还原的项目。")
            return
        self.restore_requested.emit(ids)
        self.trash_docs = [d for d in self.trash_docs if d["id"] not in ids]
        self.refresh_table()

    def on_shred_selected(self):
        ids = self.get_selected_doc_ids()
        if not ids:
            QMessageBox.information(self, "提示", "请先选中要粉碎的项目。")
            return
        self.shred_requested.emit(ids)

    def on_clear_all(self):
        if not self.trash_docs:
            return
        self.clear_all_requested.emit()


# ----------------- 启动时打开数据库独立弹窗 -----------------
class StartupVaultDialog(QDialog):
    def __init__(self, initial_db_path, parent=None):
        super().__init__(parent)
        self.setWindowIcon(get_app_icon())
        self.setWindowTitle("打开安全数据库")
        self.setFixedSize(510, 260)
        self.db_path = initial_db_path
        self.current_key = None
        self.has_pwd = False
        self.salt = None
        self.target_hash = None
        self.init_ui()
        self.inspect_database(self.db_path)

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 18, 20, 16)
        layout.setSpacing(10)

        title = QLabel("请选择或确认要解密打开的数据库文件：")
        title.setStyleSheet("font-weight: bold; font-size: 13px;")
        layout.addWidget(title)

        path_layout = QHBoxLayout()
        self.path_input = QLineEdit(self.db_path)
        self.path_input.returnPressed.connect(self.on_submit)
        self.path_input.textChanged.connect(self.inspect_database)

        btn_browse = QPushButton("📁 浏览打开...")
        btn_browse.setToolTip("选择已有的数据库文件")
        btn_browse.clicked.connect(self.on_browse)

        btn_new_db = QPushButton("＋ 新建数据库...")
        btn_new_db.setToolTip("创建指定的新数据库文件")
        btn_new_db.clicked.connect(self.on_create_new_db)

        path_layout.addWidget(self.path_input)
        path_layout.addWidget(btn_browse)
        path_layout.addWidget(btn_new_db)
        layout.addLayout(path_layout)

        self.lbl_status = QLabel("正在识别数据库...")
        self.lbl_status.setStyleSheet("color: #7aa2f7; font-weight: 500;")
        layout.addWidget(self.lbl_status)

        self.pwd_input = QLineEdit()
        self.pwd_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.pwd_input.setPlaceholderText("请输入主访问密码（按回车即可直接打开）")
        self.pwd_input.returnPressed.connect(self.on_submit)
        layout.addWidget(self.pwd_input)

        layout.addStretch()

        btn_bar = QHBoxLayout()
        self.btn_forgot = QPushButton("忘记密码？")
        self.btn_forgot.setStyleSheet("color: #f7768e; border: none; background: transparent; text-decoration: underline;")
        self.btn_forgot.clicked.connect(self.on_forgot_pwd)
        
        self.btn_cancel = QPushButton("退出")
        self.btn_cancel.clicked.connect(self.reject)

        self.btn_open = QPushButton("打开数据库 (Enter)")
        self.btn_open.setObjectName("primaryBtn")
        self.btn_open.setDefault(True)
        self.btn_open.clicked.connect(self.on_submit)

        btn_bar.addWidget(self.btn_forgot)
        btn_bar.addStretch()
        btn_bar.addWidget(self.btn_cancel)
        btn_bar.addWidget(self.btn_open)
        layout.addLayout(btn_bar)

    def on_browse(self):
        file_path, _ = QFileDialog.getOpenFileName(
            self, "选择已有数据库文件", self.path_input.text(), "SQLite Database (*.db *.sqlite);;所有文件 (*.*)"
        )
        if file_path:
            self.path_input.setText(file_path)

    def on_create_new_db(self):
        file_path, _ = QFileDialog.getSaveFileName(
            self, "创建新数据库文件", self.path_input.text(), "SQLite Database (*.db *.sqlite)"
        )
        if file_path:
            self.path_input.setText(file_path)

    def inspect_database(self, path):
        path = path.strip()
        self.db_path = path
        if not path:
            self.lbl_status.setText("⚠️ 请先输入或选择有效的数据库路径。")
            self.lbl_status.setStyleSheet("color: #f7768e;")
            self.pwd_input.setEnabled(False)
            return

        if not os.path.exists(path):
            self.lbl_status.setText("✨ 该数据库文件不存在，按回车将自动创建并初始化。")
            self.lbl_status.setStyleSheet("color: #7aa2f7;")
            self.pwd_input.setEnabled(False)
            self.has_pwd = False
            self.btn_forgot.hide()
            return

        conn = None
        try:
            conn = sqlite3.connect(path)
            cur = conn.cursor()
            cur.execute("SELECT value FROM app_config WHERE key = 'pwd_hash'")
            row_hash = cur.fetchone()
            cur.execute("SELECT value FROM app_config WHERE key = 'salt'")
            row_salt = cur.fetchone()

            if row_hash and row_hash[0] and row_salt and row_salt[0]:
                self.has_pwd = True
                self.target_hash = bytes.fromhex(row_hash[0])
                self.salt = bytes.fromhex(row_salt[0])
                self.lbl_status.setText("🔒 数据库受密码保护，请输入密码后按回车打开：")
                self.lbl_status.setStyleSheet("color: #ff9e64; font-weight: bold;")
                self.pwd_input.setEnabled(True)
                self.pwd_input.setFocus()
                self.btn_forgot.show()
            else:
                self.has_pwd = False
                self.lbl_status.setText("🔓 该数据库无密码保护，直接按回车即可打开。")
                self.lbl_status.setStyleSheet("color: #9ece6a;")
                self.pwd_input.setEnabled(False)
                self.btn_forgot.hide()
        except Exception:
            self.has_pwd = False
            self.lbl_status.setText("🔓 该数据库未设置密码，按回车即可进入。")
            self.lbl_status.setStyleSheet("color: #9ece6a;")
            self.pwd_input.setEnabled(False)
            self.btn_forgot.hide()
        finally:
            if conn:
                conn.close()

    def on_submit(self):
        path = self.path_input.text().strip()
        if not path:
            QMessageBox.warning(self, "提示", "数据库路径不能为空！")
            return

        self.db_path = path

        if self.has_pwd:
            pwd = self.pwd_input.text()
            if not pwd:
                QMessageBox.warning(self, "提示", "请输入数据库访问密码！")
                self.pwd_input.setFocus()
                return

            chk_hash, _ = SecurityManager.hash_password(pwd, self.salt)
            if chk_hash == self.target_hash:
                self.current_key = SecurityManager.derive_aes_key(pwd, self.salt)
            else:
                QMessageBox.critical(self, "密码错误", "密码错误，无法解密并打开此数据库！")
                self.pwd_input.clear()
                self.pwd_input.setFocus()
                return
        else:
            self.current_key = SecurityManager.derive_aes_key("default_empty_key", b"0000000000000000")

        self.accept()

    def on_forgot_pwd(self):
        reply = QMessageBox.warning(
            self, "重置警告",
            "重置后将抹除该数据库内所有已加密的数据与密码。\n是否确认强行重置？",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        if reply == QMessageBox.StandardButton.Yes:
            conn = None
            try:
                conn = sqlite3.connect(self.db_path)
                cur = conn.cursor()
                cur.execute("DELETE FROM app_config WHERE key IN ('pwd_hash', 'salt')")
                cur.execute("DELETE FROM vault_payload")
                conn.commit()
                QMessageBox.information(self, "重置成功", "数据库密码已清空重置，请重新打开。")
                self.inspect_database(self.db_path)
            except Exception as e:
                QMessageBox.critical(self, "重置失败", str(e))
            finally:
                if conn:
                    conn.close()


# ----------------- 功能设置窗口 -----------------
class SettingsDialog(QDialog):
    def __init__(self, current_db_path, current_theme, has_password, default_readonly, clipboard_timeout, parent=None):
        super().__init__(parent)
        self.setWindowIcon(get_app_icon())
        self.current_db_path = current_db_path
        self.current_theme = current_theme
        self.has_password = has_password
        self.default_readonly = default_readonly
        self.clipboard_timeout = clipboard_timeout
        self.setWindowTitle("功能与安全设置")
        self.setFixedSize(500, 520)
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)

        lbl_theme = QLabel("界面主题风格设置:")
        lbl_theme.setStyleSheet("font-weight: bold;")
        layout.addWidget(lbl_theme)

        self.theme_combo = QComboBox()
        for t_name in THEMES.keys():
            self.theme_combo.addItem(t_name)
        self.theme_combo.setCurrentText(self.current_theme)
        layout.addWidget(self.theme_combo)

        layout.addSpacing(6)

        lbl_clip = QLabel("剪贴板敏感数据定时自毁时间:")
        lbl_clip.setStyleSheet("font-weight: bold;")
        layout.addWidget(lbl_clip)

        self.clip_combo = QComboBox()
        self.clip_combo.addItem("15 秒自毁", 15)
        self.clip_combo.addItem("30 秒自毁 (推荐)", 30)
        self.clip_combo.addItem("60 秒自毁", 60)
        self.clip_combo.addItem("120 秒自毁", 120)
        self.clip_combo.addItem("关闭剪贴板自毁", 0)

        idx = self.clip_combo.findData(self.clipboard_timeout)
        if idx >= 0:
            self.clip_combo.setCurrentIndex(idx)
        else:
            self.clip_combo.setCurrentIndex(1)
        layout.addWidget(self.clip_combo)

        layout.addSpacing(6)

        lbl_ro = QLabel("打开已有文档防误触保护策略:")
        lbl_ro.setStyleSheet("font-weight: bold;")
        layout.addWidget(lbl_ro)

        self.ro_combo = QComboBox()
        self.ro_combo.addItem("默认只读锁定 (防止手滑误改，推荐)", 1)
        self.ro_combo.addItem("默认直接编辑 (不锁定)", 0)
        self.ro_combo.setCurrentIndex(0 if self.default_readonly else 1)
        layout.addWidget(self.ro_combo)

        layout.addSpacing(6)

        lbl_db = QLabel("整合数据库文件路径 (SQLite):")
        lbl_db.setStyleSheet("font-weight: bold;")
        layout.addWidget(lbl_db)

        path_layout = QHBoxLayout()
        self.path_input = QLineEdit(self.current_db_path)
        browse_btn = QPushButton("浏览...")
        browse_btn.clicked.connect(self.browse_path)
        path_layout.addWidget(self.path_input)
        path_layout.addWidget(browse_btn)
        layout.addLayout(path_layout)

        layout.addSpacing(6)

        lbl_pwd = QLabel("主安全访问密码配置:")
        lbl_pwd.setStyleSheet("font-weight: bold;")
        layout.addWidget(lbl_pwd)

        self.old_pwd_input = QLineEdit()
        self.old_pwd_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.old_pwd_input.setPlaceholderText("请输入当前密码")
        if not self.has_password:
            self.old_pwd_input.setEnabled(False)
            self.old_pwd_input.setPlaceholderText("首次使用，无需输入当前密码")
        layout.addWidget(self.old_pwd_input)

        self.new_pwd_input = QLineEdit()
        self.new_pwd_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.new_pwd_input.setPlaceholderText("请输入新密码 (留空则不修改密码)")
        layout.addWidget(self.new_pwd_input)

        self.confirm_pwd_input = QLineEdit()
        self.confirm_pwd_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.confirm_pwd_input.setPlaceholderText("请确认新密码")
        layout.addWidget(self.confirm_pwd_input)

        layout.addStretch()

        btn_layout = QHBoxLayout()
        cancel_btn = QPushButton("取消")
        cancel_btn.clicked.connect(self.reject)
        save_btn = QPushButton("保存配置")
        save_btn.setObjectName("primaryBtn")
        save_btn.clicked.connect(self.accept)
        btn_layout.addStretch()
        btn_layout.addWidget(cancel_btn)
        btn_layout.addWidget(save_btn)
        layout.addLayout(btn_layout)

    def browse_path(self):
        file_path, _ = QFileDialog.getSaveFileName(
            self, "选择/新建整合数据库文件", self.path_input.text(), "SQLite Database (*.db *.sqlite)"
        )
        if file_path:
            self.path_input.setText(file_path)


# ----------------- 主窗口 -----------------
class MainWindow(QMainWindow):
    def __init__(self, db_path, current_key):
        super().__init__()
        self.setWindowIcon(get_app_icon())
        self.setWindowTitle("安全文档管理系统 (Secure Document Suite)")
        self.resize(1120, 660)
        
        self.db_path = db_path
        self.current_key = current_key

        self.documents = []
        self.expanded_folder_ids = set()

        self.init_sqlite_db()

        self.current_theme_name = self.get_db_config("theme", "深色 (暗夜极客)")
        self.apply_theme(self.current_theme_name)

        self.init_ui()
        self.setup_shortcuts()
        self.load_documents_from_db()

    def init_sqlite_db(self):
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS app_config (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS vault_payload (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                nonce BLOB,
                ciphertext BLOB
            )
        """)
        conn.commit()
        conn.close()

    def get_db_config(self, key, default=None):
        try:
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            cur.execute("SELECT value FROM app_config WHERE key = ?", (key,))
            row = cur.fetchone()
            conn.close()
            return row[0] if row else default
        except Exception:
            return default

    def set_db_config(self, key, value):
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute("INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)", (key, str(value) if value is not None else ""))
        conn.commit()
        conn.close()

    def apply_theme(self, theme_name):
        if theme_name not in THEMES:
            theme_name = "深色 (暗夜极客)"
        self.current_theme_name = theme_name
        self.theme_data = THEMES[theme_name]
        QApplication.instance().setStyleSheet(self.theme_data["qss"])

    def setup_shortcuts(self):
        self.shortcut_move_up = QShortcut(QKeySequence("Ctrl+Up"), self)
        self.shortcut_move_up.activated.connect(self.move_selected_up)

        self.shortcut_move_down = QShortcut(QKeySequence("Ctrl+Down"), self)
        self.shortcut_move_down.activated.connect(self.move_selected_down)

    def init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(12, 12, 12, 12)
        main_layout.setSpacing(10)

        # 1. 顶部操作栏
        btn_bar = QHBoxLayout()
        self.btn_new = QPushButton("＋ 新建文档")
        self.btn_new.setObjectName("primaryBtn")
        self.btn_new.clicked.connect(self.open_new_document)

        self.btn_new_folder = QPushButton("📁 新建文件夹")
        self.btn_new_folder.setObjectName("folderBtn")
        self.btn_new_folder.setToolTip("新建可折叠的分类文件夹")
        self.btn_new_folder.clicked.connect(self.create_new_folder)

        self.btn_import = QPushButton("📥 导入文档")
        self.btn_import.setToolTip("支持导入 txt、docx、odt、doc 等格式文档")
        self.btn_import.clicked.connect(self.import_document)

        self.btn_export = QPushButton("📤 导出文档")
        self.btn_export.setToolTip("选中单个文档后，可无损导出为 docx、txt、html、md 等格式")
        self.btn_export.setEnabled(False)
        self.btn_export.clicked.connect(self.export_selected_document)

        self.btn_trash = QPushButton("🗑 回收站")
        self.btn_trash.setToolTip("管理已移入回收站的文档与文件夹")
        self.btn_trash.clicked.connect(self.open_trash_bin)

        self.btn_settings = QPushButton("⚙ 功能设置")
        self.btn_settings.clicked.connect(self.open_settings)

        self.btn_intro = QPushButton("💡 功能介绍")
        self.btn_intro.setToolTip("查看系统加密机制与各项核心功能详情")
        self.btn_intro.clicked.connect(self.open_feature_intro)

        btn_bar.addWidget(self.btn_new)
        btn_bar.addWidget(self.btn_new_folder)
        btn_bar.addWidget(self.btn_import)
        btn_bar.addWidget(self.btn_export)
        btn_bar.addWidget(self.btn_trash)
        btn_bar.addWidget(self.btn_settings)
        btn_bar.addWidget(self.btn_intro)
        btn_bar.addStretch()
        main_layout.addLayout(btn_bar)

        # 2. 实时检索框
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("🔍 输入关键词全库实时检索（自动展开所在文件夹并高亮匹配）...")
        self.search_input.textChanged.connect(self.on_search_text_changed)
        main_layout.addWidget(self.search_input)

        # 3. 树形列表
        self.tree = VaultTreeWidget()
        self.tree.setHeaderLabels(["名称", "大小", "修改时间", "内容 / 备注预览"])
        self.tree.header().setSectionResizeMode(0, QHeaderView.ResizeMode.Interactive)
        self.tree.header().setSectionResizeMode(1, QHeaderView.ResizeMode.ResizeToContents)
        self.tree.header().setSectionResizeMode(2, QHeaderView.ResizeMode.ResizeToContents)
        self.tree.header().setSectionResizeMode(3, QHeaderView.ResizeMode.Stretch)
        self.tree.setColumnWidth(0, 320)
        self.tree.setIndentation(20)
        self.tree.setAnimated(True)

        self.tree.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.tree.customContextMenuRequested.connect(self.show_tree_context_menu)
        self.tree.itemDoubleClicked.connect(self.on_item_double_clicked)
        self.tree.itemExpanded.connect(self.on_item_expanded)
        self.tree.itemCollapsed.connect(self.on_item_collapsed)
        self.tree.item_dropped_signal.connect(self.handle_item_dropped)
        self.tree.itemSelectionChanged.connect(self.update_export_button_state)

        main_layout.addWidget(self.tree)

    def open_feature_intro(self):
        dlg = FeatureIntroDialog(self)
        dlg.exec()

    def update_export_button_state(self):
        selected = self.tree.selectedItems()
        if len(selected) == 1:
            doc_id = selected[0].data(0, Qt.ItemDataRole.UserRole)
            doc = self.get_doc_by_id(doc_id)
            if doc and doc.get("type") != "folder":
                self.btn_export.setEnabled(True)
                return
        self.btn_export.setEnabled(False)

    def export_selected_document(self):
        selected = self.tree.selectedItems()
        if len(selected) != 1:
            return

        doc_id = selected[0].data(0, Qt.ItemDataRole.UserRole)
        doc = self.get_doc_by_id(doc_id)
        if not doc or doc.get("type") == "folder":
            return

        default_name = doc.get("name", "导出文档")
        file_path, selected_filter = QFileDialog.getSaveFileName(
            self,
            "导出安全文档",
            os.path.join(os.path.expanduser("~"), f"{default_name}.docx"),
            "Word 文档 (*.docx);;文本文件 (*.txt);;HTML 网页 (*.html);;Markdown 文档 (*.md);;所有文件 (*.*)"
        )
        if not file_path:
            return

        try:
            ext = os.path.splitext(file_path)[1].lower()
            if not ext:
                if "(*.docx)" in selected_filter:
                    file_path += ".docx"
                elif "(*.html)" in selected_filter:
                    file_path += ".html"
                elif "(*.md)" in selected_filter:
                    file_path += ".md"
                else:
                    file_path += ".txt"

            DocumentExporter.export_file(file_path, doc.get("content", ""), doc.get("name", ""))
            QMessageBox.information(self, "导出成功", f"文档已成功导出至：\n{file_path}")
        except Exception as e:
            QMessageBox.critical(self, "导出失败", f"导出过程中发生错误：\n{str(e)}")

    def handle_item_dropped(self, dragged_ids, new_parent_id, target_id, is_below):
        if not dragged_ids:
            return

        dragged_docs = [d for d in self.documents if d["id"] in dragged_ids]
        self.documents = [d for d in self.documents if d["id"] not in dragged_ids]
        for d in dragged_docs:
            d["parent_id"] = new_parent_id

        if target_id:
            target_idx = next((i for i, d in enumerate(self.documents) if d["id"] == target_id), None)
            if target_idx is not None:
                insert_idx = target_idx + 1 if is_below else target_idx
                self.documents[insert_idx:insert_idx] = dragged_docs
            else:
                self.documents.extend(dragged_docs)
        else:
            self.documents.extend(dragged_docs)

        if new_parent_id:
            self.expanded_folder_ids.add(new_parent_id)

        self.save_documents_to_db()
        self.refresh_tree()

    def is_ancestor_of(self, ancestor_id: str, candidate_id: str) -> bool:
        if not ancestor_id or not candidate_id:
            return False
        if ancestor_id == candidate_id:
            return True
        cur_id = candidate_id
        visited = set()
        while cur_id and cur_id not in visited:
            visited.add(cur_id)
            doc = self.get_doc_by_id(cur_id)
            if not doc:
                break
            p_id = doc.get("parent_id", "")
            if p_id == ancestor_id:
                return True
            cur_id = p_id
        return False

    def on_item_expanded(self, item):
        doc_id = item.data(0, Qt.ItemDataRole.UserRole)
        if doc_id:
            self.expanded_folder_ids.add(doc_id)
            doc = self.get_doc_by_id(doc_id)
            if doc:
                item.setText(0, f"📂 {doc['name']}")

    def on_item_collapsed(self, item):
        doc_id = item.data(0, Qt.ItemDataRole.UserRole)
        if doc_id:
            self.expanded_folder_ids.discard(doc_id)
            doc = self.get_doc_by_id(doc_id)
            if doc:
                item.setText(0, f"📁 {doc['name']}")

    def on_item_double_clicked(self, item, column):
        doc_id = item.data(0, Qt.ItemDataRole.UserRole)
        doc = self.get_doc_by_id(doc_id)
        if not doc:
            return

        if doc.get("type") == "folder":
            item.setExpanded(not item.isExpanded())
        else:
            self.edit_document_by_data(doc)

    def create_new_folder(self):
        parent_id = self.get_target_parent_id_from_selection()

        name, ok = QInputDialog.getText(self, "新建文件夹", "请输入文件夹名称:")
        if not (ok and name.strip()):
            return

        new_folder = {
            "id": secrets.token_hex(8),
            "type": "folder",
            "parent_id": parent_id,
            "name": name.strip(),
            "content": "",
            "size": 0,
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "preview": "文件夹",
            "marked": False,
            "in_trash": False
        }

        if parent_id:
            self.expanded_folder_ids.add(parent_id)

        self.documents.insert(0, new_folder)
        self.save_documents_to_db()
        self.refresh_tree()

    def get_target_parent_id_from_selection(self):
        current_item = self.tree.currentItem()
        if not current_item:
            return ""
        doc_id = current_item.data(0, Qt.ItemDataRole.UserRole)
        doc = self.get_doc_by_id(doc_id)
        if not doc:
            return ""
        if doc.get("type") == "folder":
            return doc["id"]
        return doc.get("parent_id", "")

    def get_doc_by_id(self, doc_id):
        return next((d for d in self.documents if d["id"] == doc_id), None)

    def move_items_to_folder(self, item_ids: list):
        if not item_ids:
            return

        active_folders = [d for d in self.documents if d.get("type") == "folder" and not d.get("in_trash", False)]
        valid_folders = [f for f in active_folders if f["id"] not in item_ids]

        options = ["📁 根目录 (/)"]
        folder_map = {"📁 根目录 (/)": ""}
        for f in valid_folders:
            display = f"📁 {self.get_folder_path_display(f['id'])}"
            options.append(display)
            folder_map[display] = f["id"]

        chosen, ok = QInputDialog.getItem(
            self, "移动分类", f"请选择要将选中的 {len(item_ids)} 个项目移动到的目标文件夹:", options, 0, False
        )
        if ok and chosen:
            target_parent_id = folder_map[chosen]
            if target_parent_id:
                self.expanded_folder_ids.add(target_parent_id)
            for doc in self.documents:
                if doc["id"] in item_ids:
                    doc["parent_id"] = target_parent_id
            self.save_documents_to_db()
            self.refresh_tree()
            QMessageBox.information(self, "移动成功", f"已成功移动 {len(item_ids)} 个项目至：{chosen}")

    def get_folder_path_display(self, folder_id):
        if not folder_id:
            return "根目录"
        path_parts = []
        cur_id = folder_id
        visited = set()
        while cur_id and cur_id not in visited:
            visited.add(cur_id)
            f = next((d for d in self.documents if d["id"] == cur_id and d.get("type") == "folder"), None)
            if f:
                path_parts.append(f["name"])
                cur_id = f.get("parent_id", "")
            else:
                break
        path_parts.reverse()
        return " / ".join(path_parts) if path_parts else "根目录"

    def shred_documents(self, doc_ids: list, show_confirm=True, parent_window=None) -> bool:
        if not doc_ids:
            return False

        parent = parent_window or self
        all_ids_to_shred = set(doc_ids)
        for target_id in doc_ids:
            all_ids_to_shred.update(self.get_all_children_ids(target_id))

        if show_confirm:
            reply = QMessageBox.warning(
                parent,
                "⚠️ 绝密安全粉碎警告",
                f"您即将对选中的 {len(all_ids_to_shred)} 个文档/文件夹执行【物理彻底粉碎】：\n\n"
                "1. 内存与磁盘扇区数据将被强随机密文多轮覆写。\n"
                "2. 数据库底层执行 VACUUM 强力物理级压缩整理，杜绝任何恢复工具取证。\n\n"
                "此操作不可逆！是否确定立即粉碎？",
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
            )
            if reply != QMessageBox.StandardButton.Yes:
                return False

        self.documents = [d for d in self.documents if d["id"] not in all_ids_to_shred]
        self.save_documents_to_db()

        try:
            conn = sqlite3.connect(self.db_path)
            conn.execute("VACUUM")
            conn.close()
        except Exception:
            pass

        self.refresh_tree()
        QMessageBox.information(parent, "粉碎完成", f"已成功粉碎销毁 {len(all_ids_to_shred)} 个项目，磁盘空间已重构！")
        return True

    def get_all_children_ids(self, folder_id: str) -> list:
        children = []
        for d in self.documents:
            if d.get("parent_id") == folder_id:
                children.append(d["id"])
                if d.get("type") == "folder":
                    children.extend(self.get_all_children_ids(d["id"]))
        return children

    def move_to_trash(self, doc_ids: list):
        if not doc_ids:
            return
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        all_ids = set(doc_ids)
        for target_id in doc_ids:
            all_ids.update(self.get_all_children_ids(target_id))

        for doc in self.documents:
            if doc["id"] in all_ids:
                doc["in_trash"] = True
                doc["deleted_at"] = now_str

        self.save_documents_to_db()
        self.refresh_tree()

    def restore_from_trash(self, doc_ids: list):
        for doc in self.documents:
            if doc["id"] in doc_ids:
                doc["in_trash"] = False
                doc["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                parent_id = doc.get("parent_id", "")
                if parent_id:
                    parent_doc = self.get_doc_by_id(parent_id)
                    if not parent_doc or parent_doc.get("in_trash", False):
                        doc["parent_id"] = ""

        self.save_documents_to_db()
        self.refresh_tree()

    def open_trash_bin(self):
        trash_items = [d for d in self.documents if d.get("in_trash", False)]
        dialog = TrashBinDialog(trash_items, self)
        dialog.restore_requested.connect(self.restore_from_trash)
        
        def handle_shred(ids):
            if self.shred_documents(ids, show_confirm=True, parent_window=dialog):
                dialog.trash_docs = [d for d in dialog.trash_docs if d["id"] not in ids]
                dialog.refresh_table()

        def handle_clear_all():
            all_ids = [d["id"] for d in dialog.trash_docs]
            if self.shred_documents(all_ids, show_confirm=True, parent_window=dialog):
                dialog.trash_docs = []
                dialog.refresh_table()

        dialog.shred_requested.connect(handle_shred)
        dialog.clear_all_requested.connect(handle_clear_all)
        dialog.exec()

    def import_document(self):
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "选择要导入的文档",
            "",
            "支持的所有文档 (*.txt *.docx *.odt *.doc);;文本文件 (*.txt);;Word 文档 (*.docx *.doc);;OpenDocument (*.odt);;所有文件 (*.*)"
        )
        if not file_path:
            return

        try:
            content_text = DocumentParser.parse_file(file_path)
            doc_name = os.path.splitext(os.path.basename(file_path))[0]
            parent_id = self.get_target_parent_id_from_selection()
            
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            size_bytes = len(content_text.encode('utf-8'))
            preview = content_text.replace("\r", " ").replace("\n", " ").strip()[:15]

            new_doc = {
                "id": secrets.token_hex(8),
                "type": "document",
                "parent_id": parent_id,
                "name": doc_name,
                "content": content_text,
                "size": size_bytes,
                "updated_at": now_str,
                "preview": preview,
                "marked": False,
                "in_trash": False
            }

            if parent_id:
                self.expanded_folder_ids.add(parent_id)

            self.documents.insert(0, new_doc)
            self.save_documents_to_db()
            self.refresh_tree()
            QMessageBox.information(self, "导入成功", f"文档《{doc_name}》已成功导入当前分类并安全入库！")
        except Exception as e:
            QMessageBox.critical(self, "导入失败", f"导入解析文档时发生错误:\n{str(e)}")

    def load_documents_from_db(self):
        try:
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            cur.execute("SELECT nonce, ciphertext FROM vault_payload WHERE id = 1")
            row = cur.fetchone()
            conn.close()

            if not row or not row[0] or not row[1]:
                self.documents = []
                self.refresh_tree()
                return

            nonce, ciphertext = row[0], row[1]
            decrypted_bytes = SecurityManager.decrypt_data(ciphertext, nonce, self.current_key)
            self.documents = json.loads(decrypted_bytes.decode('utf-8'))
        except Exception as e:
            QMessageBox.critical(self, "解密错误", f"从整合数据库解密失败: {str(e)}")
            self.documents = []
        
        self.refresh_tree()

    def save_documents_to_db(self):
        try:
            raw_data = json.dumps(self.documents, ensure_ascii=False).encode('utf-8')
            ciphertext, nonce = SecurityManager.encrypt_data(raw_data, self.current_key)
            
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            cur.execute("""
                INSERT OR REPLACE INTO vault_payload (id, nonce, ciphertext)
                VALUES (1, ?, ?)
            """, (nonce, ciphertext))
            conn.commit()
            conn.close()
        except Exception as e:
            QMessageBox.critical(self, "错误", f"写入整合数据库失败: {str(e)}")

    def refresh_tree(self):
        self.tree.clear()

        normal_color = self.theme_data["normal_color"]
        folder_color = self.theme_data["folder_color"]
        sub_color = self.theme_data["sub_color"]
        preview_color = self.theme_data["preview_color"]

        active_items = [d for d in self.documents if not d.get("in_trash", False)]
        trash_count = len(self.documents) - len(active_items)
        self.btn_trash.setText(f"🗑 回收站 ({trash_count})" if trash_count > 0 else "🗑 回收站")

        def build_branch(parent_item, parent_id):
            level_items = [d for d in active_items if d.get("parent_id", "") == parent_id]
            folders = [d for d in level_items if d.get("type") == "folder"]
            docs = [d for d in level_items if d.get("type") != "folder"]

            for doc in folders + docs:
                is_folder = doc.get("type") == "folder"
                tree_node = QTreeWidgetItem(parent_item) if parent_item else QTreeWidgetItem(self.tree)
                tree_node.setData(0, Qt.ItemDataRole.UserRole, doc["id"])

                if is_folder:
                    tree_node.setChildIndicatorPolicy(QTreeWidgetItem.ChildIndicatorPolicy.ShowIndicator)
                    is_expanded = doc["id"] in self.expanded_folder_ids
                    icon_prefix = "📂" if is_expanded else "📁"
                    tree_node.setText(0, f"{icon_prefix} {doc['name']}")
                    tree_node.setForeground(0, folder_color)
                    font = tree_node.font(0)
                    font.setBold(True)
                    tree_node.setFont(0, font)

                    child_count = len([c for c in active_items if c.get('parent_id') == doc['id']])
                    tree_node.setText(1, f"{child_count} 项")
                    tree_node.setText(2, doc.get("updated_at", ""))
                    tree_node.setText(3, "文件夹")
                    tree_node.setForeground(1, sub_color)
                    tree_node.setForeground(2, sub_color)
                    tree_node.setForeground(3, preview_color)

                    build_branch(tree_node, doc["id"])
                    tree_node.setExpanded(is_expanded)
                else:
                    tree_node.setText(0, f"📄 {doc['name']}")
                    tree_node.setForeground(0, normal_color)

                    size_kb = f"{doc.get('size', 0) / 1024:.2f} KB"
                    tree_node.setText(1, size_kb)
                    tree_node.setText(2, doc.get("updated_at", ""))
                    tree_node.setText(3, doc.get("preview", ""))

                    tree_node.setForeground(1, sub_color)
                    tree_node.setForeground(2, sub_color)
                    tree_node.setForeground(3, preview_color)

        build_branch(None, "")
        self.on_search_text_changed(self.search_input.text())
        self.update_export_button_state()

    def get_persisted_canvas_style(self):
        style_json = self.get_db_config("editor_canvas_style", "")
        if style_json:
            try:
                return json.loads(style_json)
            except Exception:
                pass
        return {"mode": "default", "bg": "", "fg": ""}

    def on_canvas_style_changed(self, style_dict):
        self.set_db_config("editor_canvas_style", json.dumps(style_dict))

    def open_new_document(self):
        clip_timeout = int(self.get_db_config("clipboard_timeout", "30"))
        parent_id = self.get_target_parent_id_from_selection()
        new_doc_template = {
            "parent_id": parent_id,
            "type": "document"
        }
        editor = DocumentEditorDialog(
            doc_data=new_doc_template,
            parent=None,
            default_readonly=False,
            clipboard_timeout=clip_timeout,
            initial_canvas_style=self.get_persisted_canvas_style()
        )
        editor.saved_signal.connect(self.on_document_saved)
        editor.canvas_style_changed.connect(self.on_canvas_style_changed)
        
        self.hide()
        try:
            editor.exec()
        finally:
            self.show()
            self.activateWindow()

    def edit_document_by_data(self, doc):
        default_ro = bool(int(self.get_db_config("default_readonly", "1")))
        clip_timeout = int(self.get_db_config("clipboard_timeout", "30"))

        editor = DocumentEditorDialog(
            doc,
            default_readonly=default_ro,
            clipboard_timeout=clip_timeout,
            initial_canvas_style=self.get_persisted_canvas_style(),
            parent=None
        )
        editor.saved_signal.connect(self.on_document_saved)
        editor.canvas_style_changed.connect(self.on_canvas_style_changed)
        
        self.hide()
        try:
            editor.exec()
        finally:
            self.show()
            self.activateWindow()

    def on_document_saved(self, new_doc):
        parent_id = new_doc.get("parent_id", "")
        if parent_id:
            self.expanded_folder_ids.add(parent_id)

        for idx, doc in enumerate(self.documents):
            if doc["id"] == new_doc["id"]:
                self.documents[idx] = new_doc
                self.save_documents_to_db()
                self.refresh_tree()
                return

        self.documents.insert(0, new_doc)
        self.save_documents_to_db()
        self.refresh_tree()

    def on_search_text_changed(self, keyword):
        keyword = keyword.strip().lower()
        if not keyword:
            def unhide_all(item):
                item.setHidden(False)
                for i in range(item.childCount()):
                    unhide_all(item.child(i))
            for i in range(self.tree.topLevelItemCount()):
                unhide_all(self.tree.topLevelItem(i))
            return

        def filter_node(item) -> bool:
            name_match = keyword in item.text(0).lower()
            preview_match = keyword in item.text(3).lower()
            item_match = name_match or preview_match

            child_matched = False
            for i in range(item.childCount()):
                if filter_node(item.child(i)):
                    child_matched = True

            should_show = item_match or child_matched
            item.setHidden(not should_show)
            if child_matched:
                item.setExpanded(True)
            return should_show

        for i in range(self.tree.topLevelItemCount()):
            filter_node(self.tree.topLevelItem(i))

    def find_tree_item_by_id(self, target_id):
        def search_node(item):
            if item.data(0, Qt.ItemDataRole.UserRole) == target_id:
                return item
            for i in range(item.childCount()):
                res = search_node(item.child(i))
                if res:
                    return res
            return None

        for i in range(self.tree.topLevelItemCount()):
            res = search_node(self.tree.topLevelItem(i))
            if res:
                return res
        return None

    def move_selected_up(self):
        item = self.tree.currentItem()
        if not item:
            return
        parent = item.parent()
        idx = parent.indexOfChild(item) if parent else self.tree.indexOfTopLevelItem(item)
        if idx <= 0:
            return
        prev_item = parent.child(idx - 1) if parent else self.tree.topLevelItem(idx - 1)
        if not prev_item:
            return
        cur_id = item.data(0, Qt.ItemDataRole.UserRole)
        prev_id = prev_item.data(0, Qt.ItemDataRole.UserRole)
        i1 = next((i for i, d in enumerate(self.documents) if d["id"] == cur_id), None)
        i2 = next((i for i, d in enumerate(self.documents) if d["id"] == prev_id), None)
        if i1 is not None and i2 is not None:
            self.documents[i1], self.documents[i2] = self.documents[i2], self.documents[i1]
            self.save_documents_to_db()
            self.refresh_tree()
            new_item = self.find_tree_item_by_id(cur_id)
            if new_item:
                self.tree.setCurrentItem(new_item)

    def move_selected_down(self):
        item = self.tree.currentItem()
        if not item:
            return
        parent = item.parent()
        count = parent.childCount() if parent else self.tree.topLevelItemCount()
        idx = parent.indexOfChild(item) if parent else self.tree.indexOfTopLevelItem(item)
        if idx >= count - 1:
            return
        next_item = parent.child(idx + 1) if parent else self.tree.topLevelItem(idx + 1)
        if not next_item:
            return
        cur_id = item.data(0, Qt.ItemDataRole.UserRole)
        next_id = next_item.data(0, Qt.ItemDataRole.UserRole)
        i1 = next((i for i, d in enumerate(self.documents) if d["id"] == cur_id), None)
        i2 = next((i for i, d in enumerate(self.documents) if d["id"] == next_id), None)
        if i1 is not None and i2 is not None:
            self.documents[i1], self.documents[i2] = self.documents[i2], self.documents[i1]
            self.save_documents_to_db()
            self.refresh_tree()
            new_item = self.find_tree_item_by_id(cur_id)
            if new_item:
                self.tree.setCurrentItem(new_item)

    def show_tree_context_menu(self, pos):
        selected_items = self.tree.selectedItems()
        if not selected_items:
            return

        doc_ids = [item.data(0, Qt.ItemDataRole.UserRole) for item in selected_items]
        is_single = len(selected_items) == 1
        first_doc = self.get_doc_by_id(doc_ids[0]) if is_single else None
        is_folder = first_doc and first_doc.get("type") == "folder"

        menu = QMenu(self)
        action_edit = None
        action_export = None
        if is_folder:
            action_add_in = menu.addAction("＋ 在此文件夹中新建文档")
            action_toggle_expand = menu.addAction("展开/收起文件夹")
        else:
            action_edit = menu.addAction("编辑文档")
            action_export = menu.addAction("📤 导出此文档...")

        action_rename = menu.addAction("重命名")
        action_move_dir = menu.addAction(f"📂 移动到文件夹... ({len(selected_items)})")
        menu.addSeparator()

        action_move_up = menu.addAction("向上移动 (Ctrl+Up)")
        action_move_down = menu.addAction("向下移动 (Ctrl+Down)")

        if is_single:
            item = selected_items[0]
            parent = item.parent()
            idx = parent.indexOfChild(item) if parent else self.tree.indexOfTopLevelItem(item)
            count = parent.childCount() if parent else self.tree.topLevelItemCount()
            if idx <= 0:
                action_move_up.setEnabled(False)
            if idx >= count - 1:
                action_move_down.setEnabled(False)
        else:
            action_rename.setEnabled(False)
            action_move_up.setEnabled(False)
            action_move_down.setEnabled(False)

        menu.addSeparator()
        action_trash = menu.addAction(f"🗑 移至回收站 ({len(selected_items)})")
        action_shred = menu.addAction(f"💥 彻底粉碎删除 ({len(selected_items)})")

        action = menu.exec(self.tree.viewport().mapToGlobal(pos))

        if is_folder and action == action_add_in:
            self.open_new_document()
        elif is_folder and action == action_toggle_expand:
            selected_items[0].setExpanded(not selected_items[0].isExpanded())
        elif not is_folder and action_edit and action == action_edit:
            self.edit_document_by_data(first_doc)
        elif not is_folder and action_export and action == action_export:
            self.export_selected_document()
        elif action == action_rename:
            self.rename_document_by_data(first_doc)
        elif action == action_move_dir:
            self.move_items_to_folder(doc_ids)
        elif action == action_move_up:
            self.move_selected_up()
        elif action == action_move_down:
            self.move_selected_down()
        elif action == action_trash:
            self.move_to_trash(doc_ids)
        elif action == action_shred:
            self.shred_documents(doc_ids, show_confirm=True)

    def rename_document_by_data(self, doc):
        title_tip = "重命名文件夹" if doc.get("type") == "folder" else "重命名文档"
        new_name, ok = QInputDialog.getText(self, title_tip, "请输入新的名称:", text=doc["name"])
        if ok and new_name.strip():
            doc["name"] = new_name.strip()
            doc["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            self.save_documents_to_db()
            self.refresh_tree()

    def open_settings(self):
        has_pwd = bool(self.get_db_config("pwd_hash"))
        default_ro = bool(int(self.get_db_config("default_readonly", "1")))
        clip_timeout = int(self.get_db_config("clipboard_timeout", "30"))

        dialog = SettingsDialog(
            self.db_path,
            self.current_theme_name,
            has_pwd,
            default_ro,
            clip_timeout,
            self
        )
        
        if dialog.exec() == QDialog.DialogCode.Accepted:
            new_theme = dialog.theme_combo.currentText()
            new_path = dialog.path_input.text().strip()
            new_ro = str(dialog.ro_combo.currentData())
            new_clip = str(dialog.clip_combo.currentData())

            old_pwd = dialog.old_pwd_input.text()
            new_pwd = dialog.new_pwd_input.text()
            confirm_pwd = dialog.confirm_pwd_input.text()

            self.set_db_config("default_readonly", new_ro)
            self.set_db_config("clipboard_timeout", new_clip)

            if new_path and new_path != self.db_path:
                old_pwd_hash = self.get_db_config("pwd_hash")
                old_salt = self.get_db_config("salt")
                self.db_path = new_path
                self.init_sqlite_db()
                if old_pwd_hash:
                    self.set_db_config("pwd_hash", old_pwd_hash)
                if old_salt:
                    self.set_db_config("salt", old_salt)
                
                app_settings = QSettings("SecureVault", "SecureDocSuite")
                app_settings.setValue("last_db_path", self.db_path)

            if new_theme != self.current_theme_name:
                self.set_db_config("theme", new_theme)
                self.apply_theme(new_theme)
                self.refresh_tree()

            if new_pwd:
                if has_pwd:
                    salt = bytes.fromhex(self.get_db_config("salt"))
                    cur_hash, _ = SecurityManager.hash_password(old_pwd, salt)
                    if cur_hash != bytes.fromhex(self.get_db_config("pwd_hash")):
                        QMessageBox.critical(self, "错误", "当前密码验证失败，密码未修改！")
                        return

                if new_pwd != confirm_pwd:
                    QMessageBox.critical(self, "错误", "新密码与确认新密码不一致！")
                    return

                new_salt = secrets.token_bytes(16)
                new_hash, _ = SecurityManager.hash_password(new_pwd, new_salt)
                self.set_db_config("salt", new_salt.hex())
                self.set_db_config("pwd_hash", new_hash.hex())
                self.current_key = SecurityManager.derive_aes_key(new_pwd, new_salt)

            self.save_documents_to_db()
            QMessageBox.information(self, "设置已保存", "功能与隐私安全设置已实时生效！")


# ----------------- 启动入口 -----------------
def main():
    if sys.platform == "win32":
        try:
            import ctypes
            ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("mycompany.securevault.app.1.0")
        except Exception:
            pass

    QLoggingCategory.setFilterRules("qt.qpa.fonts.warning=false")
    app = QApplication(sys.argv)
    
    app.setQuitOnLastWindowClosed(True)
    app.setWindowIcon(get_app_icon())

    app_settings = QSettings("SecureVault", "SecureDocSuite")
    default_db = os.path.join(os.path.dirname(os.path.abspath(__file__)), "secure_vault.db")
    last_db_path = app_settings.value("last_db_path", default_db, type=str)

    startup_dlg = StartupVaultDialog(last_db_path)
    if startup_dlg.exec() != QDialog.DialogCode.Accepted:
        sys.exit(0)

    app_settings.setValue("last_db_path", startup_dlg.db_path)

    window = MainWindow(startup_dlg.db_path, startup_dlg.current_key)
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()