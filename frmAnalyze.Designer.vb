<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()>
Partial Class frmAnalyze
    Inherits System.Windows.Forms.Form

    'Form overrides dispose to clean up the component list.
    <System.Diagnostics.DebuggerNonUserCode()>
    Protected Overrides Sub Dispose(ByVal disposing As Boolean)
        Try
            If disposing AndAlso components IsNot Nothing Then
                components.Dispose()
            End If
        Finally
            MyBase.Dispose(disposing)
        End Try
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    <System.Diagnostics.DebuggerStepThrough()>
    Private Sub InitializeComponent()
        Me.btnAddRoot = New System.Windows.Forms.Button()
        Me.btnAddChild = New System.Windows.Forms.Button()
        Me.txtNodeLabel = New System.Windows.Forms.TextBox()
        Me.pnlCanvas = New System.Windows.Forms.Panel()
        Me.chkCompactMode = New System.Windows.Forms.CheckBox()
        Me.SuspendLayout()

        'btnAddRoot
        Me.btnAddRoot.Location = New System.Drawing.Point(12, 12)
        Me.btnAddRoot.Name = "btnAddRoot"
        Me.btnAddRoot.Size = New System.Drawing.Size(100, 30)
        Me.btnAddRoot.TabIndex = 0
        Me.btnAddRoot.Text = "Add Root"
        Me.btnAddRoot.UseVisualStyleBackColor = True

        'btnAddChild
        Me.btnAddChild.Location = New System.Drawing.Point(118, 12)
        Me.btnAddChild.Name = "btnAddChild"
        Me.btnAddChild.Size = New System.Drawing.Size(100, 30)
        Me.btnAddChild.TabIndex = 1
        Me.btnAddChild.Text = "Add Child"
        Me.btnAddChild.UseVisualStyleBackColor = True

        'txtNodeLabel
        Me.txtNodeLabel.Location = New System.Drawing.Point(224, 17)
        Me.txtNodeLabel.Name = "txtNodeLabel"
        Me.txtNodeLabel.Size = New System.Drawing.Size(150, 20)
        Me.txtNodeLabel.TabIndex = 2
        Me.txtNodeLabel.Text = "New Node"

        'chkCompactMode
        Me.chkCompactMode.AutoSize = True
        Me.chkCompactMode.Location = New System.Drawing.Point(380, 19)
        Me.chkCompactMode.Name = "chkCompactMode"
        Me.chkCompactMode.Size = New System.Drawing.Size(95, 17)
        Me.chkCompactMode.TabIndex = 4
        Me.chkCompactMode.Text = "Compact Mode"
        Me.chkCompactMode.UseVisualStyleBackColor = True

        'pnlCanvas
        Me.pnlCanvas.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.pnlCanvas.Location = New System.Drawing.Point(12, 48)
        Me.pnlCanvas.Name = "pnlCanvas"
        Me.pnlCanvas.Size = New System.Drawing.Size(776, 390)
        Me.pnlCanvas.TabIndex = 3

        'frmAnalyze
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(800, 450)
        Me.Controls.Add(Me.chkCompactMode)
        Me.Controls.Add(Me.pnlCanvas)
        Me.Controls.Add(Me.txtNodeLabel)
        Me.Controls.Add(Me.btnAddChild)
        Me.Controls.Add(Me.btnAddRoot)
        Me.Name = "frmAnalyze"
        Me.Text = "Tree Analyzer"
        Me.ResumeLayout(False)
        Me.PerformLayout()
    End Sub

    Friend WithEvents btnAddRoot As Button
    Friend WithEvents btnAddChild As Button
    Friend WithEvents txtNodeLabel As TextBox
    Friend WithEvents pnlCanvas As Panel
    Friend WithEvents chkCompactMode As CheckBox
End Class