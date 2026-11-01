use ksni::blocking::TrayMethods;
use tauri::Manager;

pub struct LinuxTray {
    pub app: tauri::AppHandle,
    pub hebrew: bool,
    pub icon: ksni::Icon,
}

impl ksni::Tray for LinuxTray {
    fn id(&self) -> String { "org.luachplus.desktop".into() }
    fn title(&self) -> String { "Luach+".into() }
    fn icon_pixmap(&self) -> Vec<ksni::Icon> { vec![self.icon.clone()] }
    fn activate(&mut self, _x: i32, _y: i32) { super::show_main(&self.app); }
    fn menu(&self) -> Vec<ksni::MenuItem<Self>> {
        let (open, quit) = super::tray_labels(self.hebrew);
        vec![
            ksni::menu::StandardItem {
                label: open.into(),
                activate: Box::new(|tray: &mut Self| super::show_main(&tray.app)),
                ..Default::default()
            }.into(),
            ksni::menu::StandardItem {
                label: quit.into(),
                activate: Box::new(|tray: &mut Self| tray.app.exit(0)),
                ..Default::default()
            }.into(),
        ]
    }
}

pub fn setup(app: &tauri::App) -> bool {
    let Some(image) = app.default_window_icon() else { return false; };
    let mut pixels = image.rgba().to_vec();
    for pixel in pixels.chunks_exact_mut(4) { pixel.rotate_right(1); }
    let tray = LinuxTray {
        app: app.handle().clone(), hebrew: false,
        icon: ksni::Icon { width: image.width() as i32, height: image.height() as i32, data: pixels },
    };
    match tray.spawn() {
        Ok(handle) => { app.manage(handle); true },
        Err(error) => { eprintln!("Could not create system tray: {error}"); false },
    }
}
