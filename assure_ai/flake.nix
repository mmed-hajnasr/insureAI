{
  description = "A Nix-flake-based Python development environment using uv";

  inputs.nixpkgs.url = "https://flakehub.com/f/NixOS/nixpkgs/0.1";

  outputs =
    { self, ... }@inputs:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forEachSupportedSystem =
        f:
        inputs.nixpkgs.lib.genAttrs supportedSystems (
          system:
          f {
            pkgs = import inputs.nixpkgs { inherit system; };
          }
        );

      version = "3.13";
    in
    {
      devShells = forEachSupportedSystem (
        { pkgs }:
        let
          # Helper to convert "3.13" to "python313"
          python = pkgs."python${builtins.replaceStrings [ "." ] [ "" ] version}";
        in
        {
          default = pkgs.mkShellNoCC {
            packages = [
              python
              pkgs.uv
              pkgs.ty
              pkgs.pre-commit
              pkgs.stdenv.cc.cc.lib
            ];

            env = {
              # Prevent uv from downloading managed Python versions; use the Nix one
              UV_PYTHON_DOWNLOADS = "never";
              UV_PYTHON = "${python}/bin/python";
              LD_LIBRARY_PATH = "${pkgs.stdenv.cc.cc.lib}/lib";
            };

            shellHook = ''
              # Configuration
              VENV_DIR=".venv"

              # uv sync handles venv creation, locking, and syncing automatically.
              # It is fast enough to run on every shell entry.
              if [ -f "pyproject.toml" ]; then
                echo "Syncing environment with uv..."
                uv sync
              fi

              # Activate venv
              if [ -f "$VENV_DIR/bin/activate" ]; then
                source "$VENV_DIR/bin/activate"
              fi
            '';
          };
        }
      );
    };
}
